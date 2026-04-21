import { Request, Response } from "express";
import prisma from "../services/db";
import { enrichProfile } from "../services/enrichment";
import { classifyAge } from "../utils/classify";
import { toSnake, toSnakeList } from "../utils/serializer";
import { parseNaturalLanguageQuery } from "../services/queryParser";

type SortField = "age" | "created_at" | "gender_probability";
type SortOrder = "asc" | "desc";

interface ProfileQueryParams {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
  sort_by?: SortField;
  order?: SortOrder;
  page?: number;
  limit?: number;
}

interface ValidationResult {
  error?: { status: number; message: string };
  params?: ProfileQueryParams;
}

function parseQueryParams(query: Record<string, unknown>): ValidationResult {
  const params: ProfileQueryParams = {};

  if (query.gender !== undefined) {
    if (typeof query.gender !== "string") {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    const validGenders = ["male", "female"];
    if (!validGenders.includes(query.gender.toLowerCase())) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.gender = query.gender.toLowerCase();
  }

  if (query.age_group !== undefined) {
    if (typeof query.age_group !== "string") {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    const validAgeGroups = ["child", "teenager", "adult", "senior"];
    if (!validAgeGroups.includes(query.age_group.toLowerCase())) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.age_group = query.age_group.toLowerCase();
  }

  if (query.country_id !== undefined) {
    if (typeof query.country_id !== "string") {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.country_id = query.country_id.toUpperCase();
  }

  if (query.min_age !== undefined) {
    const val = Number(query.min_age);
    if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.min_age = val;
  }

  if (query.max_age !== undefined) {
    const val = Number(query.max_age);
    if (isNaN(val) || val < 0 || !Number.isInteger(val)) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.max_age = val;
  }

  if (query.min_gender_probability !== undefined) {
    const val = Number(query.min_gender_probability);
    if (isNaN(val) || val < 0 || val > 1) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.min_gender_probability = val;
  }

  if (query.min_country_probability !== undefined) {
    const val = Number(query.min_country_probability);
    if (isNaN(val) || val < 0 || val > 1) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.min_country_probability = val;
  }

  // ---- sort_by ----
  if (query.sort_by !== undefined) {
    // Unwrap array (e.g. ?sort_by=age&sort_by=created_at → take first)
    const raw = Array.isArray(query.sort_by) ? query.sort_by[0] : query.sort_by;
    const sortBy = typeof raw === "string" ? raw.trim() : null;

    const validSortFields: SortField[] = [
      "age",
      "created_at",
      "gender_probability",
    ];

    if (!sortBy || !validSortFields.includes(sortBy as SortField)) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }

    params.sort_by = sortBy as SortField;
  }

  // ---- order ----
  if (query.order !== undefined) {
    // Unwrap array just like sort_by
    const raw = Array.isArray(query.order) ? query.order[0] : query.order;
    const order = typeof raw === "string" ? raw.trim().toLowerCase() : null;

    if (!order || !["asc", "desc"].includes(order)) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }

    params.order = order as SortOrder;
  }

  // ---- page ----
  if (query.page !== undefined) {
    const page = Number(query.page);
    if (isNaN(page) || page < 1 || !Number.isInteger(page)) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.page = page;
  } else {
    params.page = 1;
  }

  // ---- limit ----
  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (isNaN(limit) || limit < 1 || !Number.isInteger(limit)) {
      return { error: { status: 422, message: "Invalid query parameters" } };
    }
    params.limit = Math.min(limit, 50);
  } else {
    params.limit = 10;
  }

  return { params };
}

function buildWhereClause(params: ProfileQueryParams): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (params.gender) {
    where.gender = { equals: params.gender, mode: "insensitive" };
  }
  if (params.age_group) {
    where.ageGroup = { equals: params.age_group, mode: "insensitive" };
  }
  if (params.country_id) {
    where.countryId = { equals: params.country_id, mode: "insensitive" };
  }

  if (params.min_age !== undefined || params.max_age !== undefined) {
    where.age = {
      ...(params.min_age !== undefined && { gte: params.min_age }),
      ...(params.max_age !== undefined && { lte: params.max_age }),
    };
  }

  if (params.min_gender_probability !== undefined) {
    where.genderProbability = { gte: params.min_gender_probability };
  }

  if (params.min_country_probability !== undefined) {
    where.countryProbability = { gte: params.min_country_probability };
  }

  return where;
}

function buildSortClause(params: ProfileQueryParams): Record<string, unknown> {
  const fieldMap: Record<SortField, string> = {
    age: "age",
    created_at: "createdAt",
    gender_probability: "genderProbability",
  };

  const field = params.sort_by != null ? fieldMap[params.sort_by] : "createdAt";
  const order = params.order ?? "asc";

  return { [field]: order };
}

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
          name: normalizedName,
          gender: enriched.gender,
          genderProbability: enriched.genderProbability,
          age: enriched.age,
          ageGroup: enriched.ageGroup,
          countryId: enriched.countryId,
          countryProbability: enriched.countryProbability,
          countryName: enriched.countryName,
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
          status: "error",
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
    const result = parseQueryParams(req.query as Record<string, unknown>);

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ status: "error", message: result.error.message });
    }

    const params = result.params!;
    const where = buildWhereClause(params);
    const orderBy = buildSortClause(params);

    const skip = (params.page! - 1) * params.limit!;
    const take = params.limit!;

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.profile.count({ where }),
    ]);

    return res.status(200).json({
      status: "success",
      page: params.page,
      limit: params.limit,
      total,
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

export async function searchProfiles(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== "string" || q.trim() === "") {
      return res
        .status(400)
        .json({ status: "error", message: "Missing or empty parameter" });
    }

    const parsed = parseNaturalLanguageQuery(q);

    if (!parsed) {
      return res
        .status(400)
        .json({ status: "error", message: "Unable to interpret query" });
    }

    const queryParams: ProfileQueryParams = {
      ...parsed,
      page: 1,
      limit: 10,
    };

    if (req.query.page) {
      const page = Number(req.query.page);
      queryParams.page = !isNaN(page) && page >= 1 ? page : 1;
    }
    if (req.query.limit) {
      const limit = Number(req.query.limit);
      queryParams.limit =
        !isNaN(limit) && limit >= 1 ? Math.min(limit, 50) : 10;
    }

    const where = buildWhereClause(queryParams);
    const orderBy = buildSortClause(queryParams);
    const skip = (queryParams.page! - 1) * queryParams.limit!;
    const take = queryParams.limit!;

    const [profiles, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.profile.count({ where }),
    ]);

    return res.status(200).json({
      status: "success",
      page: queryParams.page,
      limit: queryParams.limit,
      total,
      data: profiles.map(toSnakeList),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}
