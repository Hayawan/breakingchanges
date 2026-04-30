'use client';

import { useEffect, useState } from 'react';
import { Modal, Stack, Text, Button, List, Title, Alert } from '@mantine/core';
import { IconShieldLock } from '@tabler/icons-react';
import { isFirstRunSeen, markFirstRunSeen } from '@/lib/keyStorage';

interface FirstRunModalProps {
  forceOpen?: boolean;
  onAcknowledge?: () => void;
}

export function FirstRunModal({ forceOpen = false, onAcknowledge }: FirstRunModalProps) {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (forceOpen || !isFirstRunSeen()) {
      setOpened(true);
    }
  }, [forceOpen]);

  const acknowledge = () => {
    markFirstRunSeen();
    setOpened(false);
    onAcknowledge?.();
  };

  return (
    <Modal
      opened={opened}
      onClose={() => { /* dismissal requires the explicit acknowledge button */ }}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      size="lg"
      title={
        <Title order={3}>
          <IconShieldLock size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Before you bring your own key
        </Title>
      }
    >
      <Stack gap="md">
        <Text>
          Breaking Changes is a <b>bring-your-own-key</b> service. We never see, store, or log your API keys.
          A few things to know before you paste one in:
        </Text>

        <List spacing="sm" size="sm">
          <List.Item>
            <b>Where keys live.</b> By default keys are kept in your browser&apos;s <code>sessionStorage</code>{' '}
            and are wiped when you close the tab. You can opt into <code>localStorage</code> per provider
            if you&apos;d rather not paste them again — at the cost of more at-rest exposure.
          </List.Item>
          <List.Item>
            <b>How requests work.</b> When you run an analysis, your key is sent in the <code>Authorization</code>{' '}
            header to this app&apos;s server, which immediately forwards it to your chosen LLM provider and
            discards it. Nothing is persisted server-side.
          </List.Item>
          <List.Item>
            <b>If something goes wrong.</b> Revoke the key directly at the provider (OpenAI, Anthropic,
            Google, Mistral). Use the most narrowly scoped key your provider supports.
          </List.Item>
        </List>

        <Alert color="yellow" variant="light">
          Keys stored in <code>localStorage</code> are auto-cleared after 24 hours of inactivity.
          You can wipe them manually at any time from the settings drawer.
        </Alert>

        <Button fullWidth onClick={acknowledge} size="md">
          I understand
        </Button>
      </Stack>
    </Modal>
  );
}
