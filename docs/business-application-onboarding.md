# Business application onboarding

## Owner journey

1. The owner submits a business application with an email address they control.
2. Zed360 saves a private draft and shows the application reference.
3. The confirmation screen asks the owner to send a secure sign-in link to the submitted email.
4. Opening the link signs the owner in and shows the exact business that will be connected.
5. The owner explicitly confirms the connection.
6. The application becomes ready for Zed360 review.
7. Zed360 approves it, requests corrections, or rejects it.

The confirmation screen should remain concise. Its primary purpose is to acknowledge receipt and guide the owner to email verification.

Each new application receives an application-scoped random claim token. Zed360 stores only its hash. Connecting the application requires the token, an authenticated session whose normalized email exactly matches the submitted email, a draft that is still eligible for connection, and no different existing owner. Repeating the operation for the same application and account returns success without creating another ownership record.

## Approval boundary

Approval requires all three of the following:

- A linked business owner
- A verified contact email
- The ownership application created with the original submission

The admin review screen must show whether the application is waiting for its owner or ready for review. The Approve action remains disabled until all required checks pass. Registration declarations and any future PACRA checks remain separate trust signals.

## Owner-facing outcomes

- Awaiting review: the account is connected, but the profile and customer requests remain private.
- Corrections requested: the review reason and a correction action are shown.
- Rejected: the reason is shown and the owner is told not to create a duplicate application.
- Approved: the operational dashboard, public profile, and eligible matched requests become available.
