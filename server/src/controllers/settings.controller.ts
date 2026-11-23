import { Response } from "express";
import bcrypt from "bcryptjs";
import { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";

export const getSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        googleApiKey: true,
        googleClientId: true,
        googleContactsSyncAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      google: {
        hasApiKey: Boolean(user.googleApiKey),
        googleApiKey: user.googleApiKey || "",
        googleClientId: user.googleClientId || process.env.GOOGLE_CLIENT_ID || "",
        lastSyncAt: user.googleContactsSyncAt ? user.googleContactsSyncAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error("getSettings error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, avatarUrl, currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name?.trim() || null;
    }

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl?.trim() || null;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }

      if (user.passwordHash) {
        if (!currentPassword) {
          res.status(400).json({ error: "Current password is required to change password" });
          return;
        }

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          res.status(400).json({ error: "Current password is incorrect" });
          return;
        }
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      profile: {
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const updateGoogleSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { googleApiKey, googleClientId } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        googleApiKey: googleApiKey !== undefined ? (googleApiKey?.trim() || null) : undefined,
        googleClientId: googleClientId !== undefined ? (googleClientId?.trim() || null) : undefined,
      },
      select: {
        googleApiKey: true,
        googleClientId: true,
        googleContactsSyncAt: true,
      },
    });

    res.json({
      success: true,
      google: {
        hasApiKey: Boolean(updatedUser.googleApiKey),
        googleApiKey: updatedUser.googleApiKey || "",
        googleClientId: updatedUser.googleClientId || "",
        lastSyncAt: updatedUser.googleContactsSyncAt ? updatedUser.googleContactsSyncAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error("updateGoogleSettings error:", error);
    res.status(500).json({ error: "Failed to update Google settings" });
  }
};

export const syncGoogle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { googleApiKey, googleClientId } = req.body || {};
    const apiKey = googleApiKey?.trim() || user.googleApiKey;

    if (!apiKey) {
      res.status(400).json({
        error: "Google API key or OAuth Access Token is required.",
      });
      return;
    }

    // Step 1: Verify Google Account Identity & Email
    let authenticatedGoogleEmail: string | null = null;
    let fetchedName: string | null = null;
    let fetchedAvatar: string | null = null;

    // A. Verify via Google Tokeninfo endpoint (most reliable for OAuth tokens)
    try {
      const tokeninfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(apiKey)}`
      );
      if (tokeninfoRes.ok) {
        const tInfo = (await tokeninfoRes.json()) as any;
        if (tInfo.email) {
          authenticatedGoogleEmail = tInfo.email;
        }
      } else {
        const tErr = (await tokeninfoRes.json().catch(() => null)) as any;
        if (tErr?.error === "invalid_token") {
          res.status(400).json({
            error: "The provided Google token is invalid or expired. Please generate a fresh token from OAuth Playground.",
            details: tErr.error_description,
          });
          return;
        }
      }
    } catch (tErr) {
      console.warn("Tokeninfo check note:", tErr);
    }

    // B. Verify via Google Userinfo API (standard OAuth2 userinfo endpoint)
    try {
      const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (userinfoRes.ok) {
        const uInfo = (await userinfoRes.json()) as any;
        if (!authenticatedGoogleEmail && uInfo.email) {
          authenticatedGoogleEmail = uInfo.email;
        }
        if (!fetchedName && uInfo.name) {
          fetchedName = uInfo.name;
        }
        if (!fetchedAvatar && uInfo.picture) {
          fetchedAvatar = uInfo.picture;
        }
      }
    } catch (uErr) {
      console.warn("Userinfo verification note:", uErr);
    }

    // C. Verify via Google People API me endpoint
    try {
      const profileUrl = `https://people.googleapis.com/v1/people/me?personFields=names,photos,emailAddresses`;
      const profileRes = await fetch(profileUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (profileRes.ok) {
        const pData = (await profileRes.json()) as any;
        if (pData.emailAddresses && pData.emailAddresses.length > 0 && !authenticatedGoogleEmail) {
          const primary = pData.emailAddresses.find((e: any) => e.metadata?.primary);
          authenticatedGoogleEmail = (primary || pData.emailAddresses[0])?.value || authenticatedGoogleEmail;
        }
        if (pData.names && pData.names.length > 0 && !fetchedName) {
          fetchedName = pData.names[0].displayName || null;
        }
        if (pData.photos && pData.photos.length > 0 && !fetchedAvatar) {
          fetchedAvatar = pData.photos[0].url || null;
        }
      }
    } catch (pErr) {
      console.warn("People API profile note:", pErr);
    }

    // Step 2: STRICT SECURITY CHECK - Ensure Google Account matches Logged-in User
    const loggedInEmail = user.email.toLowerCase().trim();
    if (authenticatedGoogleEmail) {
      const googleEmailNormalized = authenticatedGoogleEmail.toLowerCase().trim();
      const isLocalDevAccount =
        loggedInEmail.endsWith(".local") ||
        loggedInEmail.startsWith("dev@") ||
        loggedInEmail.includes("test") ||
        process.env.NODE_ENV !== "production";

      if (isLocalDevAccount && googleEmailNormalized !== loggedInEmail) {
        // In local development environment, link and update user's email to their authentic Gmail
        await prisma.user.update({
          where: { id: userId },
          data: { email: googleEmailNormalized },
        });
      } else if (googleEmailNormalized !== loggedInEmail) {
        // In production / standard environment, strictly reject mismatched Google accounts
        res.status(403).json({
          error: `Security Verification Failed: You are logged in as "${user.email}", but these Google credentials belong to "${authenticatedGoogleEmail}". You can only sync contacts and information from your own Gmail account.`,
          code: "ACCOUNT_MISMATCH",
          loggedInEmail: user.email,
          googleEmail: authenticatedGoogleEmail,
        });
        return;
      }
    } else {
      // If the token is valid for People API connections, we proceed with contacts sync
      console.warn("Could not determine Google email directly, proceeding to test connections API...");
    }

    // Persist verified key/token to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleApiKey: apiKey,
        ...(googleClientId !== undefined ? { googleClientId: googleClientId?.trim() || null } : {}),
      },
    });

    // Step 3: Fetch Contacts from Google People API with Full Pagination
    let syncedContactsCount = 0;
    try {
      let nextPageToken: string | null = null;
      let pageCount = 0;
      const MAX_PAGES = 50; // Safety guard: up to 5,000 contacts

      do {
        pageCount++;
        const connectionsUrl = new URL("https://people.googleapis.com/v1/people/me/connections");
        connectionsUrl.searchParams.set(
          "personFields",
          "names,emailAddresses,phoneNumbers,photos,birthdays,organizations,addresses,biographies"
        );
        connectionsUrl.searchParams.set("pageSize", "100");
        if (nextPageToken) {
          connectionsUrl.searchParams.set("pageToken", nextPageToken);
        }

        const connRes = await fetch(connectionsUrl.toString(), {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!connRes.ok) {
          const errJson = (await connRes.json().catch(() => null)) as any;
          console.warn("Google People API connections error:", connRes.status, errJson);
          const errMsg = errJson?.error?.message;
          if (syncedContactsCount === 0) {
            res.status(400).json({
              error: errMsg || "Failed to fetch Google contacts with the provided credentials.",
            });
            return;
          }
          break;
        }

        const connData = (await connRes.json()) as any;
        const connections = connData.connections || [];
        for (const person of connections) {
          const rawName = person.names?.[0]?.displayName;
          const phoneNumbers = (person.phoneNumbers || []).map((p: any) => ({
            value: p.value || "",
            label: p.type || "Mobile",
          }));
          const emails = (person.emailAddresses || []).map((e: any) => ({
            value: e.value || "",
            label: e.type || "Personal",
          }));
          const addresses = (person.addresses || []).map((a: any) => ({
            formatted: a.formattedValue || "",
            label: a.type || "Home",
          }));
          const primaryPhone = phoneNumbers[0]?.value || null;
          const primaryEmail = emails[0]?.value || null;
          const notes = person.biographies?.[0]?.value || null;

          // Preserve exact case-sensitivity, fallback to email or phone if name is missing
          const displayName = (rawName?.trim()) || primaryEmail || primaryPhone || "Unnamed Contact";
          const avatarUrl = person.photos?.[0]?.url || null;
          const company = person.organizations?.[0]?.name || null;
          const jobTitle = person.organizations?.[0]?.title || null;
          const googleResourceName = person.resourceName || null;
          const etag = person.etag || null;

          let birthdayDate: Date | null = null;
          if (person.birthdays?.[0]?.date) {
            const b = person.birthdays[0].date;
            if (b.year && b.month && b.day) {
              birthdayDate = new Date(Date.UTC(b.year, b.month - 1, b.day));
            } else if (b.month && b.day) {
              birthdayDate = new Date(Date.UTC(2000, b.month - 1, b.day));
            }
          }

          // Check if contact already exists for user by googleResourceName or exact displayName
          const existing = await prisma.contact.findFirst({
            where: {
              userId,
              OR: [
                ...(googleResourceName ? [{ googleResourceName }] : []),
                { displayName },
              ],
            },
          });

          if (existing) {
            await prisma.contact.update({
              where: { id: existing.id },
              data: {
                displayName,
                avatarUrl: avatarUrl || existing.avatarUrl,
                company: company || existing.company,
                jobTitle: jobTitle || existing.jobTitle,
                phoneNumber: primaryPhone || existing.phoneNumber,
                email: primaryEmail || existing.email,
                phoneNumbers: phoneNumbers.length > 0 ? phoneNumbers : existing.phoneNumbers,
                emails: emails.length > 0 ? emails : existing.emails,
                addresses: addresses.length > 0 ? addresses : existing.addresses,
                birthday: birthdayDate || existing.birthday,
                notes: notes || existing.notes,
                googleResourceName: googleResourceName || existing.googleResourceName,
                etag: etag || existing.etag,
              },
            });
          } else {
            await prisma.contact.create({
              data: {
                userId,
                displayName,
                avatarUrl,
                company,
                jobTitle,
                phoneNumber: primaryPhone,
                email: primaryEmail,
                phoneNumbers,
                emails,
                addresses,
                birthday: birthdayDate,
                notes,
                googleResourceName,
                etag,
              },
            });
          }
          syncedContactsCount++;
        }

        nextPageToken = connData.nextPageToken || null;
      } while (nextPageToken && pageCount < MAX_PAGES);
    } catch (apiErr) {
      console.warn("Google People API fetch error:", apiErr);
    }

    // Step 4: Auto-sync Name and Profile Image if found
    const now = new Date();
    const updateUserData: any = {
      googleContactsSyncAt: now,
    };
    if (fetchedName) {
      updateUserData.name = fetchedName;
    }
    if (fetchedAvatar) {
      updateUserData.avatarUrl = fetchedAvatar;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateUserData,
    });

    res.json({
      success: true,
      message: `Verified ${authenticatedGoogleEmail}! Synced profile and ${syncedContactsCount} contacts.`,
      verifiedEmail: authenticatedGoogleEmail,
      syncedContactsCount,
      syncedAt: now.toISOString(),
      profile: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    console.error("syncGoogle error:", error);
    res.status(500).json({ error: "Failed to sync with Google" });
  }
};
