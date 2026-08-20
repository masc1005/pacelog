import { ProfileModel, type IProfile } from './profile.model.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import { HttpError } from '../../utils/httpError.js';
import type { UpdateProfileInput, UpdateSportsInput, OnboardingInput } from './profile.schemas.js';

export async function getProfileByUserId(userId: string): Promise<IProfile> {
  const profile = await ProfileModel.findOne(scopedFilter(userId));
  if (!profile) {
    throw new HttpError(404, 'PROFILE_NOT_FOUND', { message: 'Perfil não encontrado' });
  }
  return profile;
}

export async function getOrCreateProfile(userId: string, defaultName = 'Atleta'): Promise<IProfile> {
  let profile = await ProfileModel.findOne(scopedFilter(userId));
  if (!profile) {
    profile = await ProfileModel.create({
      userId,
      name: defaultName,
      activeSports: ['running'],
      primarySportKey: 'running',
    });
  }
  return profile;
}

export async function updateProfile(
  userId: string,
  payload: UpdateProfileInput
): Promise<IProfile> {
  const profile = await ProfileModel.findOneAndUpdate(
    scopedFilter(userId),
    { $set: { ...payload, userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return profile;
}

export async function updateActiveSports(
  userId: string,
  payload: UpdateSportsInput
): Promise<IProfile> {
  const updateData: Record<string, any> = {
    userId,
    activeSports: payload.activeSports,
  };

  if (payload.primarySportKey) {
    if (!payload.activeSports.includes(payload.primarySportKey)) {
      throw new HttpError(400, 'INVALID_PRIMARY_SPORT', {
        message: 'O esporte principal deve estar incluído na lista de esportes ativos',
      });
    }
    updateData.primarySportKey = payload.primarySportKey;
  } else if (payload.activeSports.length > 0) {
    // Se não informou esporte principal, garante que o atual ainda é válido ou usa o primeiro
    const current = await ProfileModel.findOne(scopedFilter(userId));
    if (current && !payload.activeSports.includes(current.primarySportKey as any)) {
      updateData.primarySportKey = payload.activeSports[0];
    } else if (!current) {
      updateData.primarySportKey = payload.activeSports[0];
    }
  }

  const profile = await ProfileModel.findOneAndUpdate(
    scopedFilter(userId),
    { $set: updateData },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return profile;
}

export async function completeOnboarding(
  userId: string,
  payload: OnboardingInput
): Promise<IProfile> {
  if (!payload.activeSports.includes(payload.primarySportKey)) {
    throw new HttpError(400, 'INVALID_PRIMARY_SPORT', {
      message: 'O esporte principal deve estar incluído na lista de esportes ativos',
    });
  }

  const profile = await ProfileModel.findOneAndUpdate(
    scopedFilter(userId),
    {
      $set: {
        userId,
        name: payload.name,
        activeSports: payload.activeSports,
        primarySportKey: payload.primarySportKey,
        weeklySessionGoal: payload.weeklySessionGoal,
        unitSystem: payload.unitSystem,
        onboardingCompletedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return profile;
}
