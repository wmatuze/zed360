import { BusinessAccountsService } from './business-accounts.service';
import { DatabaseService } from './database.service';

function queryReturning(rows: unknown[]) {
  const query = {
    from: jest.fn(),
    innerJoin: jest.fn(),
    where: jest.fn(),
    limit: jest.fn().mockResolvedValue(rows),
  };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

describe('BusinessAccountsService sign-in eligibility', () => {
  const select = jest.fn();
  const service = new BusinessAccountsService({
    db: { select },
  } as unknown as DatabaseService);

  beforeEach(() => select.mockReset());

  it('allows an email submitted with a business to create its owner account', async () => {
    select.mockReturnValueOnce(queryReturning([{ id: 'business-id' }]));

    await expect(
      service.getSignInEligibility(' Owner@Example.com '),
    ).resolves.toEqual({ eligible: true, mayCreateUser: true });
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('allows an existing business member without creating another user', async () => {
    select
      .mockReturnValueOnce(queryReturning([]))
      .mockReturnValueOnce(queryReturning([{ businessId: 'business-id' }]));

    await expect(
      service.getSignInEligibility('member@example.com'),
    ).resolves.toEqual({ eligible: true, mayCreateUser: false });
    expect(select).toHaveBeenCalledTimes(2);
  });

  it('rejects an email with no submitted or managed business', async () => {
    select
      .mockReturnValueOnce(queryReturning([]))
      .mockReturnValueOnce(queryReturning([]));

    await expect(
      service.getSignInEligibility('unknown@example.com'),
    ).resolves.toEqual({ eligible: false, mayCreateUser: false });
  });
});
