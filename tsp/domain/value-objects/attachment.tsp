import "../../common/scalars.tsp";

@doc("File attachment metadata for a feature (value object, embedded in Feature)")
model Attachment {
  @doc("Unique identifier for this attachment (UUID v4)")
  id: UUID;

  @doc("Original filename of the attached file")
  name: string;

  @doc("File size in bytes")
  size: int64;

  @doc("MIME type of the file (e.g. image/png, application/pdf)")
  mimeType: string;

  @doc("File path relative to the repository root")
  path: string;

  @doc("Timestamp when the attachment was created")
  createdAt: utcDateTime;
}
