/**
 * In-memory SOUL-backed contact store for API, tests, and demo until SoulStore FS layer is complete.
 */

import {
  Commitment,
  InteractionRecord,
  SOULProfile,
  ToneProfile,
} from '../../../shared/types';

export class MemoryContactStore {
  private profiles = new Map<string, SOULProfile>();

  constructor(seed: SOULProfile[] = []) {
    for (const p of seed) {
      this.profiles.set(p.contact_id, this.cloneProfile(p));
    }
  }

  /** Test / HEARTBEAT observability */
  interactionsAppended: { contactId: string; record: InteractionRecord }[] = [];

  async upsertProfile(profile: SOULProfile): Promise<void> {
    this.profiles.set(profile.contact_id, this.cloneProfile(profile));
  }

  async getProfile(contactId: string): Promise<SOULProfile | null> {
    const p = this.profiles.get(contactId);
    return p ? this.cloneProfile(p) : null;
  }

  async listContacts(
    limit: number,
    offset: number
  ): Promise<{ contacts: SOULProfile[]; total: number }> {
    const all = [...this.profiles.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const slice = all.slice(offset, offset + limit).map((p) => this.cloneProfile(p));
    return { contacts: slice, total: all.length };
  }

  async writeInteraction(
    contactId: string,
    interaction: InteractionRecord
  ): Promise<void> {
    let p = await this.ensureProfile(contactId);
    const rec: InteractionRecord = {
      ...interaction,
      timestamp: new Date(interaction.timestamp),
    };
    p = {
      ...p,
      interaction_log: [...p.interaction_log, rec],
    };
    this.profiles.set(contactId, p);
    this.interactionsAppended.push({ contactId, record: rec });
  }

  async mergeOpenCommitments(
    contactId: string,
    commitments: Commitment[]
  ): Promise<void> {
    if (!commitments.length) return;
    let p = await this.ensureProfile(contactId);
    const merged = [...p.open_commitments];
    const seen = new Set(
      merged.map((c) => `${c.action}|${c.target}|${String(c.deadline)}`)
    );
    for (const c of commitments) {
      const k = `${c.action}|${c.target}|${String(c.deadline)}`;
      if (!seen.has(k)) {
        merged.push({
          ...c,
          deadline: c.deadline ? new Date(c.deadline) : null,
        });
        seen.add(k);
      }
    }
    p = { ...p, open_commitments: merged };
    this.profiles.set(contactId, p);
  }

  async ensureProfile(contactId: string): Promise<SOULProfile> {
    let p = this.profiles.get(contactId);
    if (!p) {
      const now = new Date();
      p = {
        contact_id: contactId,
        name: contactId,
        relationship_weight: 0.5,
        last_contact: now,
        health_score: 80,
        tone_profile_history: [],
        open_commitments: [],
        interaction_log: [],
      };
      this.profiles.set(contactId, p);
    }
    return p;
  }

  async updateToneHistory(contactId: string, tone: ToneProfile): Promise<void> {
    const p = await this.ensureProfile(contactId);
    this.profiles.set(contactId, {
      ...p,
      tone_profile_history: [...p.tone_profile_history, tone].slice(-32),
    });
  }

  private cloneProfile(p: SOULProfile): SOULProfile {
    return {
      ...p,
      last_contact: new Date(p.last_contact),
      open_commitments: p.open_commitments.map((c) => ({
        ...c,
        deadline: c.deadline ? new Date(c.deadline) : null,
      })),
      interaction_log: p.interaction_log.map((r) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      })),
      tone_profile_history: p.tone_profile_history.map((t) => ({ ...t })),
    };
  }

  resetObservability(): void {
    this.interactionsAppended = [];
  }
}
