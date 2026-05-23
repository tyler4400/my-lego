import type { GITHUB_OAUTH_TYPE } from '@my-lego/shared'
import type { PublicUserDto } from '@/api/modules/user.ts'
import { API_HOST } from '@/api/http/constants.ts'

export interface GithubLoginPayload {
  accessToken: string
  userInfo: PublicUserDto
}
export interface GithubLoginMessage {
  type: typeof GITHUB_OAUTH_TYPE
  payload: GithubLoginPayload
}

export const getGithubOauthUrl = () => {
  return `${API_HOST}/v1/oauth/github/authorize`
}
