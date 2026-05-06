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

  private readonly twoHoursMs = 2 * 60 * 60 * 1000;

  private getFilePath(contactId: string) {
    return path.join(this.storePath, `${contactId}.json`);
  }

  private async ensureDir() {
    await fs.mkdir(this.storePath, { recursive: true });
  }

  private hydrateProfile(parsed: any): SOULProfile {
    return {
      ...parsed,
      last_contact: new Date(parsed.last_contact),
      interaction_log: (parsed.interaction_log || []).map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      })),
      tone_profile_history: parsed.tone_profile_history || [],
      open_commitments: parsed.open_commitments || [],
      broken_commitments_count: parsed.broken_commitments_count ?? 0,
      drift_detected: parsed.drift_detected ?? false,
      last_action_meta: parsed.last_action_meta
        ? {
            action_key: parsed.last_action_meta.action_key,
            fired_at: new Date(parsed.last_action_meta.fired_at),
          }
        : undefined,
    };
  }

  private async writeProfileAtomic(contactId: string, profile: SOULProfile): Promise<void> {
    await this.ensureDir();
    const filePath = this.getFilePath(contactId);
    const tmpFilePath = `${filePath}.tmp`;
    await fs.writeFile(tmpFilePath, JSON.stringify(profile, null, 2), "utf-8");
    await fs.rename(tmpFilePath, filePath);
  }

  /**
   * Get or create profile
   */
  async getProfile(contactId: string): Promise<SOULProfile> {
    await this.ensureDir();
    const filePath = this.getFilePath(contactId);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      return this.hydrateProfile(JSON.parse(data));
    } catch {
      const defaultProfile: SOULProfile = {
        contact_id: contactId,
        name: contactId,
        relationship_weight: 0.5,
        last_contact: new Date(),
        health_score: 100,
        drift_detected: false,
        broken_commitments_count: 0,
        tone_profile_history: [],
        open_commitments: [],
        interaction_log: [],
      };

      await this.writeProfileAtomic(contactId, defaultProfile);
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
        return this.hydrateProfile(JSON.parse(data));
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

    await this.writeProfileAtomic(contactId, profile);
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

    await this.writeProfileAtomic(contactId, profile);
  }

  /**
   * Update health score
   */
  async updateHealthScore(
    contactId: string,
    options?: { interactionBoost?: boolean; brokenCommitmentPenalty?: boolean }
  ): Promise<number> {
    const profile = await this.getProfile(contactId);

    const daysSinceContact =
      (new Date().getTime() - profile.last_contact.getTime()) /
      (1000 * 60 * 60 * 24);

    const inactiveWeeks = Math.floor(daysSinceContact / 7);
    let newScore = 100 - inactiveWeeks * 5;

    if (options?.interactionBoost) {
      newScore += 10;
    }

    if (options?.brokenCommitmentPenalty) {
      profile.broken_commitments_count = (profile.broken_commitments_count || 0) + 1;
    }

    newScore -= (profile.broken_commitments_count || 0) * 20;

    newScore = Math.max(0, Math.min(100, newScore));

    profile.health_score = newScore;
    profile.drift_detected = this.detectRelationshipDrift(profile);

    await this.writeProfileAtomic(contactId, profile);

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

    await this.writeProfileAtomic(contactId, profile);
  }

  detectRelationshipDrift(profile: SOULProfile): boolean {
    const daysSinceContact =
      (Date.now() - profile.last_contact.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceContact > 30 || profile.health_score < 40;
  }

  async isActionIdempotent(contactId: string, actionKey: string): Promise<boolean> {
    const profile = await this.getProfile(contactId);
    if (!profile.last_action_meta) return false;
    const lastFiredAt = new Date(profile.last_action_meta.fired_at).getTime();
    return (
      profile.last_action_meta.action_key === actionKey &&
      Date.now() - lastFiredAt < this.twoHoursMs
    );
  }

  async markActionFired(contactId: string, actionKey: string): Promise<void> {
    const profile = await this.getProfile(contactId);
    profile.last_action_meta = {
      action_key: actionKey,
      fired_at: new Date(),
    };
    await this.writeProfileAtomic(contactId, profile);
  }
}