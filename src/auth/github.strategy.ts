import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  validate(accessToken: string, refreshToken: string, profile: any) {
    console.log('🔥 STRATEGY PROFILE:', profile);

    return {
      githubHandle: profile.username,
      username: profile.username,
      email: profile.emails?.[0]?.value,
    };
  }
}
