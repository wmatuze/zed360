import { resolveReviewTransition } from './business-reviews.service';

describe('business review transitions', () => {
  it('does not allow the pending-review reject action after approval', () => {
    expect(
      resolveReviewTransition(
        { status: 'active', reviewStatus: 'approved' },
        'rejected',
      ),
    ).toBeNull();
  });

  it('suspends an approved business without discarding its approval', () => {
    expect(
      resolveReviewTransition(
        { status: 'active', reviewStatus: 'approved' },
        'suspended',
      ),
    ).toEqual({
      status: 'suspended',
      reviewStatus: 'approved',
      ownershipStatus: null,
      requiresApprovalEvidence: false,
    });
  });

  it('revokes approval into rejected and unpublished status', () => {
    expect(
      resolveReviewTransition(
        { status: 'active', reviewStatus: 'approved' },
        'approval_revoked',
      ),
    ).toEqual({
      status: 'draft',
      reviewStatus: 'rejected',
      ownershipStatus: 'rejected',
      requiresApprovalEvidence: false,
    });
  });

  it('reopens a rejected submission as pending', () => {
    expect(
      resolveReviewTransition(
        { status: 'draft', reviewStatus: 'rejected' },
        'reopened',
      ),
    ).toEqual({
      status: 'draft',
      reviewStatus: 'pending',
      ownershipStatus: 'pending',
      requiresApprovalEvidence: false,
    });
  });

  it('only reinstates an approved suspended business', () => {
    expect(
      resolveReviewTransition(
        { status: 'suspended', reviewStatus: 'approved' },
        'reinstated',
      ),
    ).toEqual({
      status: 'active',
      reviewStatus: 'approved',
      ownershipStatus: 'verified',
      requiresApprovalEvidence: true,
    });
    expect(
      resolveReviewTransition(
        { status: 'draft', reviewStatus: 'rejected' },
        'reinstated',
      ),
    ).toBeNull();
  });
});
