import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { IssuesService } from '../../src/modules/issues/issues.service';
import { createTestContext, disposeTestContext, type TestContext } from '../support/test-app';

describe('issue key generator', () => {
  let context: TestContext;
  let issuesService: IssuesService;

  beforeEach(async () => {
    context = await createTestContext();
    issuesService = context.app.get(IssuesService);
  });

  afterEach(async () => {
    await disposeTestContext(context);
  });

  it('produces unique issue keys under concurrent issue creation', async () => {
    const createdIssues = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        issuesService.createIssue(
          context.fixtures.projects.alphaProjectId,
          {
            type: 'task',
            title: `Concurrent issue ${index + 1}`,
          },
          {
            userId: context.fixtures.users.developerId,
            email: 'developer@example.com',
          },
        ),
      ),
    );

    const issueKeys = createdIssues.map((issue) => issue.issueKey);
    expect(new Set(issueKeys).size).toBe(4);
    expect(issueKeys.sort()).toEqual(['ALPHA-4', 'ALPHA-5', 'ALPHA-6', 'ALPHA-7']);
  });
});
