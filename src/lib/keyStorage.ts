'use client';

import type { LlmProvider } from "./llm";

export type StoredKeyId = LlmProvider | "github";

const KEY_PREFIX = "bc.key.";
const PERSIST_PREFIX = "bc.persist.";
const MODEL_PREFIX = "bc.model.";
const LAST_USE_KEY = "bc.lastUseAt";
const FIRST_RUN_KEY = "bc.firstRunSeen";

const IDLE_AUTO_CLEAR_MS = 24 * 60 * 60 * 1000;

const KEY_NAMESPACE: Record<StoredKeyId, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  mistral: "mistral",
  github: "github",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function keyEntry(id: StoredKeyId): string {
  return `${KEY_PREFIX}${KEY_NAMESPACE[id]}`;
}

function persistEntry(id: StoredKeyId): string {
  return `${PERSIST_PREFIX}${KEY_NAMESPACE[id]}`;
}

function modelEntry(provider: LlmProvider): string {
  return `${MODEL_PREFIX}${KEY_NAMESPACE[provider]}`;
}

export function getKey(id: StoredKeyId): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(keyEntry(id)) ?? localStorage.getItem(keyEntry(id));
}

export function isKeyPersistent(id: StoredKeyId): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(persistEntry(id)) === "true";
}

export function setKey(id: StoredKeyId, key: string, persist: boolean): void {
  if (!isBrowser()) return;
  const entry = keyEntry(id);
  sessionStorage.removeItem(entry);
  localStorage.removeItem(entry);

  if (persist) {
    localStorage.setItem(entry, key);
    localStorage.setItem(persistEntry(id), "true");
  } else {
    sessionStorage.setItem(entry, key);
    localStorage.removeItem(persistEntry(id));
  }
  markUsed();
}

export function clearKey(id: StoredKeyId): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(keyEntry(id));
  localStorage.removeItem(keyEntry(id));
  localStorage.removeItem(persistEntry(id));
}

export function clearAllKeys(): void {
  (Object.keys(KEY_NAMESPACE) as StoredKeyId[]).forEach(clearKey);
}

export function getKeyPreview(id: StoredKeyId): string | null {
  const k = getKey(id);
  if (!k) return null;
  const tail = k.slice(-4);
  return `····${tail}`;
}

export function getModel(provider: LlmProvider): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(modelEntry(provider));
}

export function setModel(provider: LlmProvider, model: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(modelEntry(provider), model);
}

export function markUsed(): void {
  if (!isBrowser()) return;
  localStorage.setItem(LAST_USE_KEY, String(Date.now()));
}

export function runIdleAutoClear(): void {
  if (!isBrowser()) return;
  const last = Number(localStorage.getItem(LAST_USE_KEY) ?? 0);
  if (!last) return;
  if (Date.now() - last <= IDLE_AUTO_CLEAR_MS) return;

  (Object.keys(KEY_NAMESPACE) as StoredKeyId[]).forEach((id) => {
    const entry = keyEntry(id);
    if (localStorage.getItem(entry)) {
      localStorage.removeItem(entry);
      localStorage.removeItem(persistEntry(id));
    }
  });
  localStorage.removeItem(LAST_USE_KEY);
}

export function isFirstRunSeen(): boolean {
  if (!isBrowser()) return true;
  return localStorage.getItem(FIRST_RUN_KEY) === "true";
}

export function markFirstRunSeen(): void {
  if (!isBrowser()) return;
  localStorage.setItem(FIRST_RUN_KEY, "true");
}

export interface KeyValidation {
  valid: boolean;
  message?: string;
}

export function validateKey(id: StoredKeyId, key: string): KeyValidation {
  const trimmed = key.trim();
  if (!trimmed) return { valid: false, message: "Key is empty" };

  switch (id) {
    case "openai":
      if (!trimmed.startsWith("sk-")) return { valid: false, message: "OpenAI keys start with 'sk-'" };
      return { valid: true };
    case "anthropic":
      if (!trimmed.startsWith("sk-ant-")) return { valid: false, message: "Anthropic keys start with 'sk-ant-'" };
      return { valid: true };
    case "google":
      if (!trimmed.startsWith("AIza")) return { valid: false, message: "Google API keys start with 'AIza'" };
      return { valid: true };
    case "mistral":
      if (trimmed.length < 20) return { valid: false, message: "Mistral keys are typically longer than 20 characters" };
      return { valid: true };
    case "github":
      if (!trimmed.startsWith("ghp_") && !trimmed.startsWith("github_pat_")) {
        return { valid: false, message: "GitHub PATs start with 'ghp_' or 'github_pat_'" };
      }
      return { valid: true };
  }
}
