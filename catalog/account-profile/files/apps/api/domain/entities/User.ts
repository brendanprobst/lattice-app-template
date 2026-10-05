export type SocialLink = { label: string; url: string };

export type UserPublicDto = {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  socialLinks: SocialLink[];
  createdAt: string;
};

export type UserOwnerDto = UserPublicDto & {
  email: string;
  zipCode: string | null;
  lat: number | null;
  lng: number | null;
};

export type UserProps = {
  id: string;
  email: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  socialLinks: SocialLink[];
  createdAt: Date;
  deletedAt: Date | null;
};

export class User {
  constructor(private props: UserProps) {}

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get zipCode(): string | null {
    return this.props.zipCode;
  }

  get handle(): string | null {
    return this.props.handle;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  applyProfileUpdate(input: {
    displayName?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    zipCode?: string | null;
    socialLinks?: SocialLink[] | null;
    handle?: string | null;
    city?: string | null;
    state?: string | null;
    lat?: number | null;
    lng?: number | null;
  }): void {
    if (input.displayName !== undefined) {
      this.props.displayName =
        input.displayName === null ? null : input.displayName.trim() || null;
    }
    if (input.avatarUrl !== undefined) {
      this.props.avatarUrl =
        input.avatarUrl === null ? null : input.avatarUrl.trim() || null;
    }
    if (input.bio !== undefined) {
      this.props.bio = input.bio === null ? null : input.bio.trim() || null;
    }
    if (input.zipCode !== undefined) {
      this.props.zipCode =
        input.zipCode === null ? null : input.zipCode.trim() || null;
    }
    if (input.socialLinks !== undefined) {
      this.props.socialLinks = input.socialLinks ?? [];
    }
    if (input.handle !== undefined) {
      this.props.handle = input.handle;
    }
    if (input.city !== undefined) this.props.city = input.city;
    if (input.state !== undefined) this.props.state = input.state;
    if (input.lat !== undefined) this.props.lat = input.lat;
    if (input.lng !== undefined) this.props.lng = input.lng;
  }

  clearGeo(): void {
    this.props.city = null;
    this.props.state = null;
    this.props.lat = null;
    this.props.lng = null;
  }

  toPublicDto(): UserPublicDto {
    return {
      id: this.props.id,
      handle: this.props.handle,
      displayName: this.props.displayName,
      avatarUrl: this.props.avatarUrl,
      bio: this.props.bio,
      city: this.props.city,
      state: this.props.state,
      socialLinks: this.props.socialLinks,
      createdAt: this.props.createdAt.toISOString(),
    };
  }

  toOwnerDto(): UserOwnerDto {
    return {
      ...this.toPublicDto(),
      email: this.props.email,
      zipCode: this.props.zipCode,
      lat: this.props.lat,
      lng: this.props.lng,
    };
  }

  toPersistence(): {
    id: string;
    email: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    zip_code: string | null;
    city: string | null;
    state: string | null;
    lat: number | null;
    lng: number | null;
    social_links: SocialLink[];
    created_at: string;
    deleted_at: string | null;
  } {
    return {
      id: this.props.id,
      email: this.props.email,
      handle: this.props.handle,
      display_name: this.props.displayName,
      avatar_url: this.props.avatarUrl,
      bio: this.props.bio,
      zip_code: this.props.zipCode,
      city: this.props.city,
      state: this.props.state,
      lat: this.props.lat,
      lng: this.props.lng,
      social_links: this.props.socialLinks,
      created_at: this.props.createdAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString() ?? null,
    };
  }
}
