import { Wish, Reservation } from '@/types';

export interface DisplayWish extends Wish {
  is_reserved?: boolean;
  reserved_by_me?: boolean;
  owner_name?: string;
}

/**
 * Anti-spoiler projection:
 * If viewer is the owner of the wish, reservation state is strictly HIDDEN (is_reserved = false).
 * If viewer is another family member, they see whether it's reserved and whether they reserved it.
 */
export function applyAntiSpoiler<T extends Wish>(
  wishes: T[],
  reservations: Reservation[],
  viewerId: string,
  targetUserId: string
): (T & { is_reserved: boolean; reserved_by_me: boolean })[] {
  const isOwner = viewerId === targetUserId;

  return wishes.map((wish) => {
    const reservation = reservations.find((r) => r.wish_id === wish.id);
    if (isOwner) {
      return {
        ...wish,
        is_reserved: false,
        reserved_by_me: false,
      };
    }
    return {
      ...wish,
      is_reserved: Boolean(reservation),
      reserved_by_me: reservation?.reserved_by === viewerId,
    };
  });
}
