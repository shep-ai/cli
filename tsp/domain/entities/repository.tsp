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
}
