'use client';

import { useEffect, useState } from 'react';
import {
  Drawer,
  Stack,
  Text,
  Title,
  PasswordInput,
  Switch,
  Button,
  Group,
  Divider,
  Select,
  Badge,
  Alert,
  Anchor,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import {
  type StoredKeyId,
  getKey,
  setKey,
  clearKey,
  clearAllKeys,
  isKeyPersistent,
  validateKey,
  getModel,
  setModel,
  getKeyPreview,
} from '@/lib/keyStorage';
import type { LlmProvider } from '@/lib/llm';

interface ProviderMeta {
  id: LlmProvider;
  label: string;
  keyDocsUrl: string;
  models: { value: string; label: string }[];
  defaultModel: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    keyDocsUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
    models: [
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini (fast, cheap)' },
      { value: 'gpt-4o', label: 'gpt-4o' },
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
      { value: 'gpt-4.1', label: 'gpt-4.1' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-haiku-4-5',
    models: [
      { value: 'claude-haiku-4-5', label: 'claude-haiku-4-5 (fast)' },
      { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6' },
      { value: 'claude-opus-4-7', label: 'claude-opus-4-7' },
    ],
  },
  {
    id: 'google',
    label: 'Google',
    keyDocsUrl: 'https://aistudio.google.com/app/apikey',
    defaultModel: 'gemini-2.5-flash',
    models: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
      { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral',
    keyDocsUrl: 'https://console.mistral.ai/api-keys/',
    defaultModel: 'mistral-small-latest',
    models: [
      { value: 'mistral-small-latest', label: 'mistral-small-latest' },
      { value: 'mistral-large-latest', label: 'mistral-large-latest' },
    ],
  },
];

interface SettingsDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ opened, onClose }: SettingsDrawerProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={<Title order={4}>Settings</Title>}
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Bring your own keys. By default they are stored in <code>sessionStorage</code> and wiped when
          you close the tab. Opt into <code>localStorage</code> per provider if you&apos;d like them to
          persist.
        </Text>

        {PROVIDERS.map((p) => (
          <ProviderSection key={p.id} meta={p} />
        ))}

        <Divider />
        <GitHubPatSection />

        <Divider />
        <Group justify="space-between">
          <Text size="sm" c="dimmed">Wipe every stored key from this browser.</Text>
          <Button
            color="red"
            variant="light"
            leftSection={<IconTrash size={16} />}
            onClick={() => {
              clearAllKeys();
              notifications.show({ message: 'Cleared all stored keys', color: 'green' });
              onClose();
            }}
          >
            Clear all keys
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}

function ProviderSection({ meta }: { meta: ProviderMeta }) {
  const [keyValue, setKeyValue] = useState('');
  const [persist, setPersist] = useState(false);
  const [modelValue, setModelValue] = useState<string>(meta.defaultModel);
  const [savedPreview, setSavedPreview] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setSavedPreview(getKeyPreview(meta.id));
    setPersist(isKeyPersistent(meta.id));
    setModelValue(getModel(meta.id) ?? meta.defaultModel);
  }, [meta.id, meta.defaultModel]);

  const onSave = () => {
    const validation = validateKey(meta.id, keyValue);
    if (!validation.valid) {
      notifications.show({
        title: `${meta.label} key looks off`,
        message: validation.message ?? 'Invalid key',
        color: 'red',
      });
      return;
    }
    setKey(meta.id, keyValue.trim(), persist);
    setKeyValue('');
    setSavedPreview(getKeyPreview(meta.id));
    notifications.show({ message: `${meta.label} key saved`, color: 'green' });
  };

  const onClear = () => {
    clearKey(meta.id);
    setSavedPreview(null);
    setKeyValue('');
    notifications.show({ message: `${meta.label} key cleared`, color: 'gray' });
  };

  const onTest = async () => {
    const stored = getKey(meta.id) ?? keyValue.trim();
    if (!stored) {
      notifications.show({ message: 'Enter or save a key first', color: 'yellow' });
      return;
    }
    setTesting(true);
    try {
      const r = await fetch('/api/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${stored}`,
        },
        body: JSON.stringify({ provider: meta.id }),
      });
      if (r.ok) {
        notifications.show({ message: `${meta.label} key works`, color: 'green', icon: <IconCheck size={16} /> });
      } else {
        const data = await r.json().catch(() => ({}));
        notifications.show({
          title: `${meta.label} test failed`,
          message: data.error ?? `Provider returned ${r.status}`,
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } catch {
      notifications.show({ message: 'Test connection failed', color: 'red' });
    } finally {
      setTesting(false);
    }
  };

  const onModelChange = (v: string | null) => {
    if (!v) return;
    setModelValue(v);
    setModel(meta.id, v);
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Title order={5}>{meta.label}</Title>
          {savedPreview && <Badge variant="light" color="green">{savedPreview}</Badge>}
        </Group>
        <Anchor href={meta.keyDocsUrl} target="_blank" rel="noopener noreferrer" size="xs">
          Get a key →
        </Anchor>
      </Group>

      <PasswordInput
        placeholder={savedPreview ? 'Replace stored key' : 'Paste API key'}
        value={keyValue}
        onChange={(e) => setKeyValue(e.currentTarget.value)}
        autoComplete="off"
        spellCheck={false}
      />

      <Select
        label="Model"
        data={meta.models}
        value={modelValue}
        onChange={onModelChange}
        allowDeselect={false}
        searchable
      />

      <Group justify="space-between" align="center">
        <Switch
          label="Remember on this device"
          checked={persist}
          onChange={(e) => setPersist(e.currentTarget.checked)}
          size="sm"
        />
        <Group gap="xs">
          <Button size="xs" variant="default" onClick={onTest} loading={testing} disabled={!savedPreview && !keyValue.trim()}>
            Test
          </Button>
          <Button size="xs" variant="light" onClick={onSave} disabled={!keyValue.trim()}>
            Save
          </Button>
          <Button size="xs" variant="subtle" color="red" onClick={onClear} disabled={!savedPreview}>
            Clear
          </Button>
        </Group>
      </Group>

      {persist && (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={14} />} p="xs">
          <Text size="xs">
            Persisted keys are auto-cleared after 24h idle. Storing here trades convenience for at-rest
            exposure if your browser is compromised.
          </Text>
        </Alert>
      )}
    </Stack>
  );
}

function GitHubPatSection() {
  const ID: StoredKeyId = 'github';
  const [val, setVal] = useState('');
  const [persist, setPersist] = useState(false);
  const [savedPreview, setSavedPreview] = useState<string | null>(null);

  useEffect(() => {
    setSavedPreview(getKeyPreview(ID));
    setPersist(isKeyPersistent(ID));
  }, []);

  const onSave = () => {
    const v = validateKey(ID, val);
    if (!v.valid) {
      notifications.show({ title: 'GitHub PAT looks off', message: v.message ?? '', color: 'red' });
      return;
    }
    setKey(ID, val.trim(), persist);
    setVal('');
    setSavedPreview(getKeyPreview(ID));
    notifications.show({ message: 'GitHub PAT saved', color: 'green' });
  };

  const onClear = () => {
    clearKey(ID);
    setSavedPreview(null);
    setVal('');
    notifications.show({ message: 'GitHub PAT cleared', color: 'gray' });
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Title order={5}>GitHub (optional)</Title>
          {savedPreview && <Badge variant="light" color="green">{savedPreview}</Badge>}
        </Group>
        <Anchor href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" size="xs">
          Create a fine-grained PAT →
        </Anchor>
      </Group>
      <Text size="xs" c="dimmed">
        Optional. Lifts the 60 req/hr unauthenticated GitHub API ceiling. Use a read-only,
        public-repos-only fine-grained PAT.
      </Text>
      <PasswordInput
        placeholder={savedPreview ? 'Replace stored PAT' : 'Paste GitHub PAT'}
        value={val}
        onChange={(e) => setVal(e.currentTarget.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <Group justify="space-between" align="center">
        <Switch
          label="Remember on this device"
          checked={persist}
          onChange={(e) => setPersist(e.currentTarget.checked)}
          size="sm"
        />
        <Group gap="xs">
          <Button size="xs" variant="light" onClick={onSave} disabled={!val.trim()}>Save</Button>
          <Button size="xs" variant="subtle" color="red" onClick={onClear} disabled={!savedPreview}>Clear</Button>
        </Group>
      </Group>
    </Stack>
  );
}
