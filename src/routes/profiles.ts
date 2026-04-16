import { Router } from "express";
import {
  createProfile,
  getProfileById,
  getProfiles,
  deleteProfile,
} from "../controllers/profileController";

const router = Router();

router.post("/profiles", createProfile);
router.get("/profiles", getProfiles);
router.get("/profiles/:id", getProfileById);
router.delete("/profiles/:id", deleteProfile);

export default router;