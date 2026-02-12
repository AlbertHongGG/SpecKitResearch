-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "owner_user_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_anonymous" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "publish_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Survey_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "survey_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Question_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "Survey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "Option_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RuleGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "survey_id" TEXT NOT NULL,
    "target_question_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "group_operator" TEXT NOT NULL,
    CONSTRAINT "RuleGroup_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "Survey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LogicRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rule_group_id" TEXT NOT NULL,
    "source_question_id" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "LogicRule_rule_group_id_fkey" FOREIGN KEY ("rule_group_id") REFERENCES "RuleGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurveyPublish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "survey_id" TEXT NOT NULL,
    "publish_hash" TEXT NOT NULL,
    "schema_json" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyPublish_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "Survey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "survey_id" TEXT NOT NULL,
    "survey_publish_id" TEXT NOT NULL,
    "respondent_id" TEXT,
    "publish_hash" TEXT NOT NULL,
    "response_hash" TEXT NOT NULL,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Response_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "Survey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Response_survey_publish_id_fkey" FOREIGN KEY ("survey_publish_id") REFERENCES "SurveyPublish" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Response_respondent_id_fkey" FOREIGN KEY ("respondent_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    CONSTRAINT "Answer_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "Response" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Survey_slug_key" ON "Survey"("slug");

-- CreateIndex
CREATE INDEX "Question_survey_id_order_idx" ON "Question"("survey_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Option_question_id_value_key" ON "Option"("question_id", "value");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyPublish_publish_hash_key" ON "SurveyPublish"("publish_hash");

-- CreateIndex
CREATE INDEX "Response_survey_id_submitted_at_idx" ON "Response"("survey_id", "submitted_at");

-- CreateIndex
CREATE INDEX "Answer_response_id_idx" ON "Answer"("response_id");
