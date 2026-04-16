interface ProfileFields {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  ageGroup: string | null;
  countryId: string | null;
  genderProbability?: number | null;
  sampleSize?: number | null;
  countryProbability?: number | null;
  createdAt?: string;
}

interface SnakecaseProfile {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  age_group: string | null;
  country_id: string | null;
  gender_probability: number | null;
  sample_size: number | null;
  country_probability: number | null;
  created_at: string;
}

export function toSnake(profile: ProfileFields): SnakecaseProfile {
  return {
    id: profile.id,
    name: profile.name,
    gender: profile.gender,
    age: profile.age,
    age_group: profile.ageGroup,
    country_id: profile.countryId,
    gender_probability: profile.genderProbability ?? null,
    sample_size: profile.sampleSize ?? null,
    country_probability: profile.countryProbability ?? null,
    created_at: profile.createdAt ?? "",
  };
}

export function toSnakeList(profile: ProfileFields): Partial<SnakecaseProfile> {
  return {
    id: profile.id,
    name: profile.name,
    gender: profile.gender,
    age: profile.age,
    age_group: profile.ageGroup,
    country_id: profile.countryId,
  };
}