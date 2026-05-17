import type { NotificationEvent } from '@/types';

export interface AdaptiveCardAction {
  type: 'Action.OpenUrl';
  title: string;
  url: string;
}

export interface AdaptiveCardPayload {
  type: 'AdaptiveCard';
  version: '1.4';
  body: Array<{
    type: 'TextBlock';
    text: string;
    weight?: 'Bolder';
    size?: 'Small' | 'Medium';
    wrap?: boolean;
    color?: 'Accent' | 'Good' | 'Warning' | 'Attention';
  }>;
  actions: AdaptiveCardAction[];
}

export function buildAdaptiveCard(notification: Pick<NotificationEvent, 'title' | 'message' | 'deepLink'>): AdaptiveCardPayload {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: notification.title,
        weight: 'Bolder',
        size: 'Medium',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: notification.message,
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: 'Meridian Goal Setting & Tracking Portal',
        size: 'Small',
        color: 'Accent',
        wrap: true,
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Open in Meridian',
        url: notification.deepLink,
      },
    ],
  };
}
