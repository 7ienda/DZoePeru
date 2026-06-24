import supabase from "./supabase-feed.js";

window.saveMetaConfig = async function () {
  const config = {
    feed_url: document.getElementById("meta-feed-url").value,
    facebook_page_id: document.getElementById("facebook-page-id").value,
    instagram_business_id: document.getElementById("instagram-business-id").value,
    whatsapp_business_id: document.getElementById("whatsapp-business-id").value,
    access_token: document.getElementById("meta-access-token").value
  };

  await supabase.from("meta_config").upsert(config);
};
