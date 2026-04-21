-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "gender" VARCHAR(10),
    "gender_probability" DOUBLE PRECISION,
    "age" INTEGER,
    "age_group" VARCHAR(20),
    "country_id" VARCHAR(2),
    "country_name" VARCHAR(100),
    "country_probability" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_name_key" ON "profiles"("name");

-- CreateIndex
CREATE INDEX "profiles_gender_idx" ON "profiles"("gender");

-- CreateIndex
CREATE INDEX "profiles_country_id_idx" ON "profiles"("country_id");

-- CreateIndex
CREATE INDEX "profiles_age_group_idx" ON "profiles"("age_group");

-- CreateIndex
CREATE INDEX "profiles_age_idx" ON "profiles"("age");

-- CreateIndex
CREATE INDEX "profiles_gender_probability_idx" ON "profiles"("gender_probability");

-- CreateIndex
CREATE INDEX "profiles_country_probability_idx" ON "profiles"("country_probability");

-- CreateIndex
CREATE INDEX "profiles_created_at_idx" ON "profiles"("created_at");
