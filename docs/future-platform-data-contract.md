# Future competition platform: data contract

Read this document before building the competition platform. This public marketing and registration site does not implement these controls. They are non-negotiable for any later platform that ranks agents, selects finalists, stores CVs, or transfers personal data to Optiver.

## CV sharing is never automatic

- Reaching the top 50, qualifying for the London final, uploading a CV, or ticking the registration contact-interest checkbox does **not** automatically authorise sharing a CV with Optiver.
- Sharing a CV with Optiver requires a **separate, explicit, recorded confirmation** from that **named** participant **after** finalist selection and **before** any transfer.

## Recorded confirmation

Every finalist-stage CV-sharing confirmation must store:

- the exact consent **text version** shown to the participant
- the **timestamp** of the decision
- the current **withdrawal status**

A later withdrawal must be recorded against the same participant and must block any subsequent transfer.

## Transfer gate

Block any Optiver CV export or transfer unless **all** of the following are true:

1. the person is a confirmed London finalist
2. a CV is on file
3. a separate finalist-stage confirmation exists for that named participant
4. that confirmation has not been withdrawn

## Access isolation

- Optiver must **not** receive routine access to the registration database, file storage, or admin dashboard.
- Organiser tools that review eligibility, ranking, judging, selection, attendance, or prizes must keep CV-sharing consent separate from those decisions.

## Launch prerequisites

Before the competition platform launches:

- private file storage
- signed access to stored files
- server-side authorisation for every read, export, or transfer
- audit logging of access and transfer attempts
- retention and deletion jobs
- a documented withdrawal process

## Before any personal data transfer to Optiver

The organiser must obtain and configure all of the following from Optiver and the event legal owner:

- Optiver’s exact contracting legal entity
- Optiver’s privacy-notice URL
- recipient country or countries
- any international-transfer safeguard that applies

Do not transfer personal data until those details are confirmed and recorded.
