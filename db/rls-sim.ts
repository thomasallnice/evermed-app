// Lightweight helpers to simulate RLS semantics in unit tests
export function canAccessPerson(ownerId: string, authId: string) {
  return ownerId === authId;
}

export function canAccessDocument(personOwnerId: string, authId: string) {
  return personOwnerId === authId;
}

