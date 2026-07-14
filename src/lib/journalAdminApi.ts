export type JournalPost = {
  id: string; title: string; slug: string; status: 'draft' | 'scheduled' | 'published' | 'archived';
  subtitle: string | null; excerpt: string | null; body: string; content_format: 'markdown' | 'rich_text' | 'video' | 'mixed';
  cover_image_url: string | null; cover_image_alt: string | null; original_language: string; category_id: string | null;
  primary_creator_id: string | null; is_featured: boolean; is_vision_feature: boolean; published_at: string | null;
  scheduled_for: string | null; reading_time_minutes: number | null; seo_title: string | null; seo_description: string | null;
  publication_timezone: string; created_at: string; updated_at: string;
};
export type JournalOption = { id: string; label: string };
export type JourneyPerson = { id: string; display_name: string; full_name: string | null; person_type: string; email: string | null };
export type EventTypeOption = { key: string; label: string; description: string | null };
export type FounderOption = { id: string; label: string; slug: string };
export type JournalPayload = Omit<JournalPost, 'id' | 'created_at' | 'updated_at'>;
export type JournalEventPayload = {
  subject_founder_ids: string[]; person_ids: string[]; event_type: string; occurred_at: string;
  timezone: string; journey_person: string; location_name: string; address_text: string;
  latitude: string; longitude: string; plus_code: string; description: string;
  show_on_map: boolean; show_on_timeline: boolean; is_public_location: boolean;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = 'bankrupt1m.admin.session';
function token() { const raw=localStorage.getItem(sessionKey); if(!raw) throw new Error('Geen geldige adminsessie.'); const parsed=JSON.parse(raw) as {access_token?:string}; if(!parsed.access_token) throw new Error('Geen geldige adminsessie.'); return parsed.access_token; }
async function request<T>(path:string,init?:RequestInit):Promise<T>{
  if(!supabaseUrl||!anonKey) throw new Error('Supabase configuratie ontbreekt.');
  const response=await fetch(`${supabaseUrl}${path}`,{...init,headers:{apikey:anonKey,Authorization:`Bearer ${token()}`,'Content-Type':'application/json',...(init?.headers||{})}});
  if(!response.ok){const payload=await response.json().catch(()=>null) as {message?:string;details?:string}|null;throw new Error(payload?.message||payload?.details||`Supabase request failed (${response.status})`);}
  if(response.status===204)return undefined as T;return response.json() as Promise<T>;
}
export async function listJournalPosts(){return request<JournalPost[]>('/rest/v1/journal_posts?select=*&order=updated_at.desc&limit=200');}
export async function getJournalOptions(){
  const [categories,authors,founders,people,eventTypes]=await Promise.all([
    request<Array<{id:string;name:string}>>('/rest/v1/journal_categories?select=id,name&order=name.asc'),
    request<Array<{id:string;display_name:string}>>('/rest/v1/journal_authors?select=id,display_name&order=display_name.asc'),
    request<Array<{id:string;display_name:string;slug:string}>>('/rest/v1/founder_profiles?select=id,display_name,slug&order=display_order.asc'),
    request<JourneyPerson[]>('/rest/v1/journey_people?select=id,display_name,full_name,person_type,email&order=display_name.asc&limit=500'),
    request<EventTypeOption[]>('/rest/v1/journey_entry_types?select=key,label,description&is_active=eq.true&order=display_order.asc'),
  ]);
  return {categories:categories.map(i=>({id:i.id,label:i.name})),authors:authors.map(i=>({id:i.id,label:i.display_name})),founders:founders.map(i=>({id:i.id,label:i.display_name,slug:i.slug})),people,eventTypes};
}
export async function createJournalPost(payload:Partial<JournalPayload>){return request<JournalPost>('/rest/v1/rpc/admin_create_journal_post',{method:'POST',body:JSON.stringify({payload})});}
export async function updateJournalPost(id:string,payload:Partial<JournalPayload>){return request<JournalPost>('/rest/v1/rpc/admin_update_journal_post',{method:'POST',body:JSON.stringify({post_id:id,payload})});}
export async function deleteJournalPost(id:string){return request<boolean>('/rest/v1/rpc/admin_delete_journal_post',{method:'POST',body:JSON.stringify({post_id:id})});}
export async function saveJournalEventContext(postId:string,payload:JournalEventPayload){return request<string>('/rest/v1/rpc/admin_save_journal_event_context',{method:'POST',body:JSON.stringify({post_id:postId,payload})});}
export async function createJourneyPerson(payload:Record<string,unknown>){return request<JourneyPerson>('/rest/v1/rpc/admin_create_journey_person',{method:'POST',body:JSON.stringify({payload})});}
export async function uploadJournalFootage(postId:string,file:File,index:number){
  if(!supabaseUrl||!anonKey)throw new Error('Supabase configuratie ontbreekt.');
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-'); const bucket=file.type.startsWith('video/')?'media-videos':'media-images';
  const path=`journal/${postId}/${Date.now()}-${index}-${safe}`;
  const upload=await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`,{method:'POST',headers:{apikey:anonKey,Authorization:`Bearer ${token()}`,'Content-Type':file.type,'x-upsert':'false'},body:file});
  if(!upload.ok)throw new Error((await upload.json().catch(()=>null) as {message?:string}|null)?.message||'Footage upload mislukt.');
  const publicUrl=`${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  const assets=await request<Array<{id:string}>>('/rest/v1/media_assets',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({asset_type:file.type.startsWith('video/')?'video':'image',title:file.name,original_filename:file.name,storage_bucket:bucket,storage_path:path,mime_type:file.type,file_size_bytes:file.size,visibility:'public',status:'published',published_at:new Date().toISOString(),show_in_media_vault:true,external_url:publicUrl})});
  const asset=assets[0]; if(!asset)throw new Error('Media asset kon niet worden geregistreerd.');
  await request('/rest/v1/journal_post_media',{method:'POST',body:JSON.stringify({journal_post_id:postId,media_asset_id:asset.id,placement:index===0?'hero':'gallery',display_order:index,is_featured:index===0})});
  return asset.id;
}
