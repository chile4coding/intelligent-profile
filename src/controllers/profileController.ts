import { Request, Response } from "express";
import prisma from "../services/db";
import { enrichProfile } from "../services/enrichment";
import { classifyAge } from "../utils/classify";
import { toSnake, toSnakeList } from "../utils/serializer";
import { uuidv7 } from "uuidv7";

export async function createProfile(req: Request, res: Response) {
  try {
    const { name } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing or empty name" });
    }

    if (typeof name !== "string") {
      return res.status(422).json({ status: "error", message: "Invalid type" });
    }

    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing or empty name" });
    }

    const existing = await prisma.profile.findUnique({
      where: { name: normalizedName },
    });

    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: toSnake(existing),
      });
    }

    const enriched = await enrichProfile(normalizedName);
    enriched.ageGroup = classifyAge(enriched.age);

    try {
      const profile = await prisma.profile.create({
        data: {
          id: uuidv7(),
          name: normalizedName,
          gender: enriched.gender,
          genderProbability: enriched.genderProbability,
          sampleSize: enriched.sampleSize,
          age: enriched.age,
          ageGroup: enriched.ageGroup,
          countryId: enriched.countryId,
          countryProbability: enriched.countryProbability,
          createdAt: new Date().toISOString(),
        },
      });

      return res
        .status(201)
        .json({ status: "success", data: toSnake(profile) });
    } catch (createErr: unknown) {
      if (
        typeof createErr === "object" &&
        createErr !== null &&
        "code" in createErr &&
        createErr.code === "P2002"
      ) {
        const existing = await prisma.profile.findUnique({
          where: { name: normalizedName },
        });
        if (existing) {
          return res.status(200).json({
            status: "success",
            message: "Profile already exists",
            data: toSnake(existing),
          });
        }
      }
      throw createErr;
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (
        err.message.includes("Genderize") ||
        err.message.includes("Agify") ||
        err.message.includes("Nationalize")
      ) {
        return res.status(502).json({
          status: "502",
          message: err.message,
        });
      }
    }
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}

export async function getProfileById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const profile = await prisma.profile.findUnique({ where: { id } });

    if (!profile) {
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });
    }

    return res.status(200).json({ status: "success", data: toSnake(profile) });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}

export async function getProfiles(req: Request, res: Response) {
  try {
    const { gender, country_id, age_group } = req.query;

    const where: Record<string, unknown> = {};

    if (gender) {
      where.gender = { equals: gender as string, mode: "insensitive" };
    }
    if (country_id) {
      where.countryId = {
        equals: country_id as string,
        mode: "insensitive",
      };
    }
    if (age_group) {
      where.ageGroup = { equals: age_group as string, mode: "insensitive" };
    }

    const profiles = await prisma.profile.findMany({
      where,
      select: {
        id: true,
        name: true,
        gender: true,
        age: true,
        ageGroup: true,
        countryId: true,
      },
    });

    return res.status(200).json({
      status: "success",
      count: profiles.length,
      data: profiles.map(toSnakeList),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}

export async function deleteProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const profile = await prisma.profile.findUnique({ where: { id } });

    if (!profile) {
      return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });
    }

    await prisma.profile.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}
