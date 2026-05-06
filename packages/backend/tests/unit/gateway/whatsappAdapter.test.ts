import { WhatsAppAdapter } from '../../../src/gateway/adapters/whatsapp/WhatsAppAdapter';

const basePayload = {
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ profile: { name: 'Alice' } }],
          },
        },
      ],
    },
  ],
};

describe('WhatsAppAdapter.parseWebhookPayload', () => {
  test('parses text message', () => {
    const adapter = new WhatsAppAdapter();
    const payload = {
      ...basePayload,
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Alice' } }],
                messages: [
                  {
                    id: 'msg-1',
                    from: '123',
                    timestamp: '1714920000',
                    type: 'text',
                    text: { body: 'Hello' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const event = adapter.parseWebhookPayload(payload);
    expect(event?.id).toBe('msg-1');
    expect(event?.content).toBe('Hello');
    expect(event?.sender.name).toBe('Alice');
    expect(event?.metadata?.type).toBe('text');
  });

  test('parses interactive button reply', () => {
    const adapter = new WhatsAppAdapter();
    const payload = {
      ...basePayload,
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Bob' } }],
                messages: [
                  {
                    id: 'msg-2',
                    from: '456',
                    timestamp: '1714920001',
                    type: 'interactive',
                    interactive: { button_reply: { title: 'Yes' } },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const event = adapter.parseWebhookPayload(payload);
    expect(event?.id).toBe('msg-2');
    expect(event?.content).toBe('Yes');
    expect(event?.sender.name).toBe('Bob');
  });

  test('parses status update', () => {
    const adapter = new WhatsAppAdapter();
    const payload = {
      ...basePayload,
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'status-1',
                    recipient_id: '123',
                    status: 'delivered',
                    timestamp: '1714920002',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const event = adapter.parseWebhookPayload(payload);
    expect(event?.id).toBe('status-1');
    expect(event?.content).toBe('status:delivered');
    expect(event?.sender.id).toBe('123');
  });
});
