import { describe, it, expect } from 'vitest';
import { applyAntiSpoiler } from '../wishes/antiSpoiler';
import { Wish, Reservation } from '@/types';

describe('Anti-Spoiler Engine', () => {
  const dummyWishes: Wish[] = [
    {
      id: 'wish-1',
      user_id: 'user-alice',
      title: 'Лего Космос',
      created_at: new Date().toISOString(),
      priority: 'must_have',
      event_tag: 'День рождения',
    },
    {
      id: 'wish-2',
      user_id: 'user-alice',
      title: 'Книга по TypeScript',
      created_at: new Date().toISOString(),
      priority: 'nice_to_have',
      event_tag: 'Новый год',
    },
  ];

  const dummyReservations: Reservation[] = [
    {
      id: 'res-1',
      wish_id: 'wish-1',
      reserved_by: 'user-bob',
      created_at: new Date().toISOString(),
    },
  ];

  it('guarantees owner NEVER sees any reservation status on their own wishes', () => {
    const ownerView = applyAntiSpoiler(
      dummyWishes,
      dummyReservations,
      'user-alice', // viewer is Alice
      'user-alice'  // target is Alice
    );

    expect(ownerView).toHaveLength(2);
    // Wish-1 is reserved by Bob in DB, but Alice MUST NOT know!
    expect(ownerView[0].is_reserved).toBe(false);
    expect(ownerView[0].reserved_by_me).toBe(false);

    expect(ownerView[1].is_reserved).toBe(false);
    expect(ownerView[1].reserved_by_me).toBe(false);
  });

  it('allows other family members to see if gift is taken by someone else', () => {
    const charlieView = applyAntiSpoiler(
      dummyWishes,
      dummyReservations,
      'user-charlie', // viewer is Charlie
      'user-alice'    // target is Alice
    );

    // Wish-1 is reserved by Bob
    expect(charlieView[0].is_reserved).toBe(true);
    expect(charlieView[0].reserved_by_me).toBe(false);

    // Wish-2 is not reserved
    expect(charlieView[1].is_reserved).toBe(false);
    expect(charlieView[1].reserved_by_me).toBe(false);
  });

  it('indicates reserved_by_me = true specifically to the member who made the reservation', () => {
    const bobView = applyAntiSpoiler(
      dummyWishes,
      dummyReservations,
      'user-bob',   // viewer is Bob
      'user-alice'  // target is Alice
    );

    // Bob reserved wish-1
    expect(bobView[0].is_reserved).toBe(true);
    expect(bobView[0].reserved_by_me).toBe(true);
  });
});
