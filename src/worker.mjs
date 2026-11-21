import { handleEnquiry } from './enquiry.mjs';

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/api/enquiry') {
      return handleEnquiry(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
