/**
 * @module Shep.Domain.Entities.Repository
 *
 * Defines the Repository entity - a first-class domain entity representing
 * a code repository tracked by the Shep platform.
 *
 * Repositories are the organizational unit for Features. Each Feature belongs
 * to exactly one Repository via a repositoryId foreign key.
 */
import "../../common/base.tsp";
import "../../common/scalars.tsp";

/**
 * Repository Entity
 *
 * Represents a code repository tracked by the Shep platform.
 * Features reference repositories by ID, enabling persistence
 * and independent lifecycle management.
 */
@doc("A code repository tracked by the Shep platform")
model Repository extends SoftDeletableEntity {
  @doc("Human-readable name for the repository (typically the directory name)")
  name: string;

  @doc("Absolute file system path to the repository root (unique)")
  path: string;

  @doc("Remote GitHub URL this repository was cloned from (normalized: lowercase, no .git suffix)")
  remoteUrl?: string;

  @doc("Whether this repository is a fork created by shep for contributing to a repo the user lacks push access to")
  isFork?: boolean;

  @doc("Original upstream repository URL when isFork is true (normalized: lowercase, no .git suffix)")
  upstreamUrl?: string;
}
