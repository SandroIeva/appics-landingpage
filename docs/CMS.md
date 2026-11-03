# Journal CMS — editorial guide

## Access

Open https://appics-landingpage.vercel.app/journal/editor/ and sign in with the shared editor password supplied privately by the project owner. The owner's existing local access note is `.editor-access.txt`; it is deliberately excluded from Git. A new checkout will not contain it.

This is a lightweight custom CMS, not WordPress or a separate hosted CMS service. It currently has one shared editor password, with no individual accounts or roles. Sessions expire after eight hours. Use Sign out when finished on a shared device.

## Create and publish an article

1. Choose **New article** in the editor.
2. Fill in the title, URL slug, introduction, category, author and article text.
3. Upload a cover image and add a meaningful image description (alt text).
4. Choose **Save draft** to keep the article private.
5. Choose **Preview** to open the saved article in a new tab. Allow the preview popup if your browser blocks it.
6. Choose **Publish** when ready, then check the public Journal and article URL.

Draft previews require an authenticated editor session. Readers cannot access draft article URLs or draft-only uploaded covers through the public API.

## Article fields

| Field | How to use it |
| --- | --- |
| Title | Main article heading; at least 3 characters, maximum 180 |
| Slug | URL segment, e.g. `a-new-creative-perspective`; keep it stable after publication because automatic redirects are not provided |
| Introduction / excerpt | Short summary displayed on listings and below the title; maximum 500 characters |
| Category | Creativity, Music, Community, Creation Lab, Culture, Creators, or Interviews |
| Author | Visible byline; defaults to APPICS Journal |
| Cover image | Upload JPG, PNG or WebP, or use an existing supported `/assets/creators/…` path |
| Image description | Describe the image for screen-reader users; maximum 250 characters |
| Body | Paragraphs, section headings and quotes; syntax below |
| Featured | Places a story in consideration for the large lead position; if several are featured, the most recently updated one wins |
| Order | Lower values come first in the main article listing |

The Interviews category populates the dark **In Conversation** carousel. Until published interviews exist, the carousel shows selected existing creative-perspective articles.

## Text formatting

Separate paragraphs with a blank line. Start a heading with `## ` and a quote with `> `.

```text
A short opening paragraph that introduces the idea.

## A different perspective

Continue your story here.

> A memorable line from the story.
```

This is a limited block editor. Raw HTML is escaped; arbitrary embeds, inline images, rich Markdown links, bold/italic formatting and video blocks are not currently implemented. Reading time is calculated automatically from the text.

## Images

Uploads are resized in the browser to a maximum dimension of 1600 px and converted to WebP. The API checks the image format and limits an uploaded file to 2.8 MB. Use a high-quality source image with enough space around the subject: the overview, carousel and article cover use different crop ratios.

Uploaded images are stored privately in Vercel Blob and served through the application's media endpoint. Images referenced by published articles become publicly readable through that endpoint. Do not upload confidential material as a published cover.

## Update or withdraw an article

- Select an article from the editor list and make changes.
- **Save changes** on an already published article updates the live article immediately.
- **Preview also saves first**, preserving the current draft/published status. Previewing changes to an already published article therefore saves them publicly; use a separate draft if you need a private alternative.
- **Move to drafts / unpublish** removes the article from public listings and makes its public article URL unavailable.
- There is no permanent-delete button or scheduling workflow in the current editor.

If another session saved the same article first, the server rejects a stale save instead of silently overwriting it. Copy any unsaved text somewhere safe, reload the article, and apply your changes again.

## Where content is saved

Starter stories come from `content/journal-seed.json`. CMS records override starter stories by ID; new CMS stories are added alongside them. Editing a starter JSON file will not replace an existing CMS override with the same ID.

The private Blob store contains:

- `journal/articles/<id>.json`: current CMS records.
- `journal/history/<id>/…`: previous saved article versions.
- `journal/media/…`: uploaded covers.
- `journal/subscribers/…`: newsletter registrations.

Previous versions are retained, but there is no restore-history UI yet. An authorized developer can inspect and restore records through the storage service after taking a backup. GitHub does not contain these runtime records.

## Newsletter status

The signup form stores an email registration privately. It does not send newsletters or confirmation emails. Before running email campaigns, connect an email/newsletter provider and implement the confirmation and unsubscribe flow, subscriber administration and appropriate policy information. The CMS currently has no subscriber export or campaign screen.

## Troubleshooting

- **Cannot log in:** check the password with the owner; repeated failures are temporarily rate-limited.
- **Saving unavailable:** check Vercel function logs and storage/environment setup with a developer. Keep unsaved text before refreshing.
- **Upload rejected:** use JPG, PNG or WebP; reduce the source image if needed.
- **Article missing:** confirm it is Published and check its category/filter and slug.
- **Changes visible locally but not live:** verify that local and production environments use the intended Blob store. Code changes need deployment; normal CMS publication does not.
