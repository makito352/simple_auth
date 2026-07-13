/**
 * @file frontend/src/components/features/admin/oidc/api.ts
 * @description OIDC管理画面で利用するAPIの集約エントリ
 */
export {
  createClaimMapping,
  createOidcScope,
  deleteClaimMapping,
  deleteOidcScope,
  fetchClaimMappings,
  fetchOidcScopes,
  updateClaimMapping,
  updateOidcScope,
} from "@/lib/api/oidc";

export { fetchOptionAttributes } from "@/lib/api/user_options";