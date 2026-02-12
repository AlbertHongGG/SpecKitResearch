export type RegistrationRosterItemDto = {
  name: string
  email: string
  registered_at: string
}

export type RegistrationRosterResponseDto = {
  items: RegistrationRosterItemDto[]
}
