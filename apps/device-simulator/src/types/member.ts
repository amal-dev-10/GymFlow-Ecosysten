export interface SimMember {
  id: string;
  name: string;
  phone?: string;
}

export function toSimMember(apiMember: any): SimMember {
  return {
    id: apiMember.id,
    name: [apiMember.firstName, apiMember.lastName].filter(Boolean).join(" ").trim() || "Unknown Member",
    phone: apiMember.phoneNumber,
  };
}
