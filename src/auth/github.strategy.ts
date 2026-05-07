import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
      scope: ['user:email'],
    });
  }

  validate(access_token: any, refresh_token: any, profile: any) {
    return {
      githubHandle: profile.username,
      username: profile.username,
      email: profile.emails?.[0]?.value,
    };
  }
}
