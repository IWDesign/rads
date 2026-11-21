import { handleEnquiry } from '../../src/enquiry.mjs';

export function onRequestPost({ request, env }) {
  return handleEnquiry(request, env);
}
