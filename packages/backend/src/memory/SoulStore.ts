import fs from "fs/promises";
import path from "path";
import {
  SOULProfile,
  InteractionRecord,
  ToneProfile,
  Commitment,
} from "../../../shared/types";

export class SoulStore {
  constructor(private storePath: string = "./souls") {}

  private getFilePath(contactId: string) {
    return path.join(this.storePath, `${contactId}.json`);
  }

  private async ensureDir() {
    await fs.mkdir(this.storePath, { recursive: true });
  }

  /**
   * Get or create profile
   */
  async getProfile(contactId: string): Promise<SOULProfile> {
    await this.ensureDir();
    const filePath = this.getFilePath(contactId);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      const defaultProfile: SOULProfile = {
        contact_id: contactId,
        name: contactId,
        relationship_weight: 0.5,
        last_contact: new Date(),
        health_score: 100,
        tone_profile_history: [],
        open_commitments: [],
        interaction_log: [],
      };

      await fs.writeFile(filePath, JSON.stringify(defaultProfile, null, 2));
      return defaultProfile;
    }
  }

  /**
   * List all contacts
   */
  async listContacts(): Promise<SOULProfile[]> {
    await this.ensureDir();
    const files = await fs.readdir(this.storePath);

    const profiles = await Promise.all(
      files.map(async (file) => {
        const data = await fs.readFile(
          path.join(this.storePath, file),
          "utf-8"
        );
        const parsed = JSON.parse(data);

// 🔥 convert string → Date
parsed.last_contact = new Date(parsed.last_contact);

// also fix interaction log timestamps (important)
parsed.interaction_log = parsed.interaction_log.map((i: any) => ({
  ...i,
  timestamp: new Date(i.timestamp),
}));

return parsed;
      })
    );

    return profiles;
  }

  /**
   * Search contacts
   */
  async searchByName(name: string): Promise<SOULProfile[]> {
    const all = await this.listContacts();
    return all.filter((p) =>
      p.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Write interaction
   */
  async writeInteraction(
    contactId: string,
    interaction: InteractionRecord
  ): Promise<void> {
    const profile = await this.getProfile(contactId);

    profile.interaction_log.push(interaction);
    profile.last_contact = new Date();

    await fs.writeFile(
      this.getFilePath(contactId),
      JSON.stringify(profile, null, 2)
    );
  }

  /**
   * Update commitment
   */
  async updateCommitment(
    contactId: string,
    commitment: Commitment,
    status: "pending" | "fulfilled"
  ): Promise<void> {
    const profile = await this.getProfile(contactId);

    if (status === "pending") {
      profile.open_commitments.push(commitment);
    } else {
      profile.open_commitments = profile.open_commitments.filter(
        (c) => c.action !== commitment.action
      );
    }

    await fs.writeFile(
      this.getFilePath(contactId),
      JSON.stringify(profile, null, 2)
    );
  }

  /**
   * Update health score
   */
  async updateHealthScore(contactId: string): Promise<number> {
    const profile = await this.getProfile(contactId);

    const daysSinceContact =
      (new Date().getTime() - profile.last_contact.getTime()) /
      (1000 * 60 * 60 * 24);

    let newScore = profile.health_score;

    if (daysSinceContact > 7) newScore -= 5;
    if (daysSinceContact > 30) newScore -= 10;

    newScore = Math.max(0, Math.min(100, newScore));

    profile.health_score = newScore;

    await fs.writeFile(
      this.getFilePath(contactId),
      JSON.stringify(profile, null, 2)
    );

    return newScore;
  }

  /**
   * Update tone profile
   */
  async updateToneProfile(
    contactId: string,
    tone: ToneProfile
  ): Promise<void> {
    const profile = await this.getProfile(contactId);

    profile.tone_profile_history.push(tone);

    await fs.writeFile(
      this.getFilePath(contactId),
      JSON.stringify(profile, null, 2)
    );
  }
}