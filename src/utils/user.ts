import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

let generatedDisplayName: string = null;

export function anonymousUserDisplayName(): string {
  if (generatedDisplayName) {
    return generatedDisplayName;
  }

  generatedDisplayName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    length: 2,
  });

  return generatedDisplayName;
}

export function anonUserAvatarUrl(displayName: string): string {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(displayName)}&size=64`;
}
