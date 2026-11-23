import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../lib/prisma.js";
import { decryptCredential } from "../lib/crypto.js";

interface TestConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Creates an ImapFlow instance for a Gmail account
 */
export function createGmailClient(email: string, appPassword: string): ImapFlow {
  const cleanPass = appPassword.replace(/\s+/g, "");
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: email.trim(),
      pass: cleanPass,
    },
    logger: false,
    clientInfo: {
      name: "point001-inbox",
      version: "1.0.0",
    },
  });
}

/**
 * Test credentials against Gmail IMAP
 */
export async function testImapConnection(email: string, appPassword: string): Promise<TestConnectionResult> {
  const client = createGmailClient(email, appPassword);
  try {
    await client.connect();
    await client.status("INBOX", { messages: true });
    await client.logout();
    return { success: true };
  } catch (error: any) {
    try {
      client.close();
    } catch {
      // ignore close errors
    }
    const message = error?.message || "Failed to authenticate with Gmail IMAP";
    return { success: false, error: message };
  }
}

/**
 * Synchronize emails for a specific EmailAccount
 */
export async function syncEmailAccount(accountId: string): Promise<{ syncedCount: number }> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Email account not found");
  }

  // Set syncing status
  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { syncStatus: "SYNCING", errorMessage: null },
  });

  const plainPassword = decryptCredential(account.credentials);
  const client = createGmailClient(account.email, plainPassword);

  let syncedCount = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const status = await client.status("INBOX", { messages: true });
      const totalMessages = status && typeof status.messages === "number" ? status.messages : 0;

      if (totalMessages > 0) {
        // Fetch up to the last 60 recent messages from the inbox
        const fetchStartSeq = Math.max(1, totalMessages - 60);
        const seqRange = `${fetchStartSeq}:*`;

        const messages = client.fetch(seqRange, {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
          internalDate: true,
        });

        for await (const msg of messages) {
          try {
            const parsed = msg.source ? await simpleParser(msg.source) : null;

            const fromObj = msg.envelope?.from?.[0] || parsed?.from?.value?.[0];
            const senderName = fromObj?.name || fromObj?.address?.split("@")[0] || "Unknown";
            const senderEmail = fromObj?.address || account.email;
            const subject = msg.envelope?.subject || parsed?.subject || "(No subject)";

            const textContent = parsed?.text || "";
            const snippet = textContent
              ? textContent.replace(/\s+/g, " ").trim().slice(0, 180)
              : subject;

            const bodyHtml =
              (parsed?.html as string) ||
              (parsed?.textAsHtml as string) ||
              textContent.replace(/\n/g, "<br/>") ||
              "";

            const date = msg.envelope?.date || msg.internalDate || new Date();
            const isUnread = !msg.flags?.has("\\Seen");
            const isStarred = Boolean(msg.flags?.has("\\Flagged"));

            // Resolve sender avatar
            let senderAvatarUrl: string | null = null;
            if (senderEmail.includes("@")) {
              const contact = await prisma.contact.findFirst({
                where: {
                  userId: account.userId,
                  email: { equals: senderEmail, mode: "insensitive" },
                },
                select: { avatarUrl: true },
              });
              if (contact?.avatarUrl) {
                senderAvatarUrl = contact.avatarUrl;
              } else {
                const domain = senderEmail.split("@")[1]?.toLowerCase();
                if (domain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain)) {
                  senderAvatarUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                }
              }
            }

            await prisma.emailMessage.upsert({
              where: {
                accountId_messageId: {
                  accountId: account.id,
                  messageId: String(msg.uid),
                },
              },
              create: {
                accountId: account.id,
                messageId: String(msg.uid),
                threadId: msg.envelope?.messageId || null,
                senderName,
                senderEmail,
                senderAvatarUrl,
                subject,
                snippet,
                bodyHtml,
                date: new Date(date),
                isUnread,
                isStarred,
              },
              update: {
                isUnread,
                isStarred,
                subject,
                snippet,
                senderAvatarUrl: senderAvatarUrl || undefined,
                bodyHtml: bodyHtml || undefined,
              },
            });

            syncedCount++;
          } catch (msgErr) {
            console.error(`[emailSync] Failed parsing message UID ${msg.uid}:`, msgErr);
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        syncStatus: "SUCCESS",
        lastSyncedAt: new Date(),
        errorMessage: null,
      },
    });

    return { syncedCount };
  } catch (error: any) {
    try {
      client.close();
    } catch {
      // ignore
    }

    const errMessage = error?.message || "Sync failed";
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        syncStatus: "ERROR",
        errorMessage: errMessage,
      },
    });

    throw error;
  }
}

/**
 * Update message read flag on remote IMAP server and database
 */
export async function updateRemoteMessageRead(
  accountId: string,
  messageUid: string,
  isUnread: boolean
): Promise<void> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) return;

  const plainPassword = decryptCredential(account.credentials);
  const client = createGmailClient(account.email, plainPassword);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      if (!isUnread) {
        // Mark as Read in Gmail
        await client.messageFlagsAdd(messageUid, ["\\Seen"], { uid: true });
      } else {
        // Mark as Unread in Gmail
        await client.messageFlagsRemove(messageUid, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    try {
      client.close();
    } catch {
      // ignore
    }
    console.warn(`[emailSync] Could not update remote IMAP flag for UID ${messageUid}:`, error);
  }
}

/**
 * Update message starred flag on remote IMAP server
 */
export async function updateRemoteMessageStarred(
  accountId: string,
  messageUid: string,
  isStarred: boolean
): Promise<void> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) return;

  const plainPassword = decryptCredential(account.credentials);
  const client = createGmailClient(account.email, plainPassword);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      if (isStarred) {
        await client.messageFlagsAdd(messageUid, ["\\Flagged"], { uid: true });
      } else {
        await client.messageFlagsRemove(messageUid, ["\\Flagged"], { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    try {
      client.close();
    } catch {
      // ignore
    }
    console.warn(`[emailSync] Could not update remote IMAP star for UID ${messageUid}:`, error);
  }
}
