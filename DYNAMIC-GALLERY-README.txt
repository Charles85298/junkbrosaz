AZ JUNK BROTHERS — DYNAMIC PHOTO GALLERIES

HOW TO ADD PHOTOS
1. Open the appropriate folder under:
   assets/images/services/
2. Upload one or more JPG, JPEG, PNG, WEBP, GIF, AVIF, or SVG files.
3. Commit the upload to the main branch.
4. GitHub Actions automatically rebuilds:
   assets/data/gallery-manifest.json
5. Cloudflare Pages deploys the updated site automatically.

You do not need to edit index.html or JavaScript when adding photos.

IMPORTANT
- Keep each photo in the correct service folder.
- Use simple filenames, for example: garage-cleanout-01.jpg
- Avoid unusual symbols in filenames.
- The GitHub workflow needs Actions permission to write repository contents.
  In GitHub: Settings > Actions > General > Workflow permissions
  select "Read and write permissions" if the workflow cannot commit.

SUPPORTED SERVICE FOLDERS
- home-cleanouts
- furniture-removal
- construction-debris
- yard-and-outdoor-debris
- appliances-and-heavy-items
- business-and-office
- estate-cleanouts
- sheds-and-small-structures
