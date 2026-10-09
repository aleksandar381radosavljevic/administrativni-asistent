import { describe, expect, it } from "vitest";
import { ApiError, mapDbError } from "./errors";

const statusAndCode = (code: string, message = "") => {
  const error = mapDbError({ code, message });
  return [error.status, error.code];
};

describe("mapDbError", () => {
  it("maps a cycle rejected by the trigger to 409 circular_dependency", () => {
    expect(
      statusAndCode(
        "23514",
        "circular dependency: procedure x already (transitively) depends on y",
      ),
    ).toEqual([409, "circular_dependency"]);
  });

  it("maps other check violations (publish and cost rules) to 422", () => {
    expect(
      statusAndCode(
        "23514",
        "life event x is published but has no published procedure",
      ),
    ).toEqual([422, "validation_error"]);
  });

  it("maps a foreign key violation (dependency outside the event) to 422", () => {
    expect(statusAndCode("23503")).toEqual([422, "validation_error"]);
  });

  it("maps a unique violation to 409 conflict", () => {
    expect(statusAndCode("23505")).toEqual([409, "conflict"]);
  });

  it("maps insufficient privilege (RLS, write guard) to 403", () => {
    expect(statusAndCode("42501")).toEqual([403, "forbidden"]);
  });

  it("maps an invalid or expired JWT to 401", () => {
    expect(statusAndCode("PGRST301")).toEqual([401, "unauthorized"]);
    expect(statusAndCode("PGRST303")).toEqual([401, "unauthorized"]);
  });

  it("maps a missing single row to 404 and a malformed value to 400", () => {
    expect(statusAndCode("PGRST116")).toEqual([404, "not_found"]);
    expect(statusAndCode("22P02")).toEqual([400, "bad_request"]);
  });

  it("maps no_data_found from the admin write functions to 404", () => {
    expect(statusAndCode("P0002")).toEqual([404, "not_found"]);
  });

  it("names the field when a publish rule or a reference is broken", () => {
    expect(
      mapDbError({
        code: "23514",
        message: "procedure x is published but has no steps",
      }).details,
    ).toEqual([
      { field: "steps", message: "Procedura mora imati najmanje jedan korak." },
    ]);
    expect(
      mapDbError({
        code: "23503",
        message:
          'insert or update on table "procedure_dependencies" violates foreign key constraint "fk_pd_depends_on_in_event"',
      }).details,
    ).toEqual([
      {
        field: "depends_on_id",
        message: "Procedura nije u ovom životnom događaju.",
      },
    ]);
  });

  it("hides anything unknown behind a 500", () => {
    const error = mapDbError({
      code: "XX000",
      message: "relation secret_table does not exist",
    });
    expect([error.status, error.code]).toEqual([500, "internal_error"]);
    expect(error.message).not.toContain("secret_table");
  });

  it("gives validation errors a details array, as 03 ValidationError requires", () => {
    expect(mapDbError({ code: "23503" }).toBody()).toEqual({
      error: "validation_error",
      message: "Proveri označena polja.",
      details: [],
    });
  });
});

describe("ApiError.toBody", () => {
  it("omits details on plain errors", () => {
    expect(ApiError.notFound().toBody()).toEqual({
      error: "not_found",
      message: "Nismo pronašli ono što tražiš.",
    });
  });
});
