export type AvatarGender = 'male' | 'female';

export interface CuratedAvatar {
  id: string;
  gender: AvatarGender;
  label: string;
  url: string;
}

export const MALE_AVATARS: CuratedAvatar[] = [
  { id: 'male-1', gender: 'male', label: 'Male 1 (Alex)', url: '/avatars/male-1.svg' },
  { id: 'male-2', gender: 'male', label: 'Male 2 (Marcus)', url: '/avatars/male-2.svg' },
  { id: 'male-3', gender: 'male', label: 'Male 3 (Leo)', url: '/avatars/male-3.svg' },
  { id: 'male-4', gender: 'male', label: 'Male 4 (Ethan)', url: '/avatars/male-4.svg' },
];

export const FEMALE_AVATARS: CuratedAvatar[] = [
  { id: 'female-1', gender: 'female', label: 'Female 1 (Emma)', url: '/avatars/female-1.svg' },
  { id: 'female-2', gender: 'female', label: 'Female 2 (Sophia)', url: '/avatars/female-2.svg' },
  { id: 'female-3', gender: 'female', label: 'Female 3 (Maya)', url: '/avatars/female-3.svg' },
  { id: 'female-4', gender: 'female', label: 'Female 4 (Olivia)', url: '/avatars/female-4.svg' },
];

export const ALL_AVATARS: CuratedAvatar[] = [...MALE_AVATARS, ...FEMALE_AVATARS];

export const DEFAULT_MALE_AVATAR = MALE_AVATARS[0];
export const DEFAULT_FEMALE_AVATAR = FEMALE_AVATARS[0];

export function getAvatarById(id?: string): CuratedAvatar | undefined {
  if (!id) return undefined;
  return ALL_AVATARS.find(avatar => avatar.id === id);
}

export function getDefaultAvatar(gender: AvatarGender = 'male'): CuratedAvatar {
  return gender === 'female' ? DEFAULT_FEMALE_AVATAR : DEFAULT_MALE_AVATAR;
}

export function resolveAvatarUrl(avatarId?: string, photoURL?: string, gender: AvatarGender = 'male'): string {
  if (avatarId) {
    const matched = getAvatarById(avatarId);
    if (matched) return matched.url;
  }
  if (photoURL && photoURL.trim()) {
    return photoURL;
  }
  return getDefaultAvatar(gender).url;
}
