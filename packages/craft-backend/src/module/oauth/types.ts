export interface GithubUser {
  id: number
  login: string // github username
  name: string | null
  avatar_url: string
  email: string | null
}

export interface GithubEmailItem {
  email: string
  primary: boolean
  verified: boolean
  visibility: 'public' | 'private' | null
}
