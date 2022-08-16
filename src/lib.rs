#![allow(unused_variables)]
#![allow(dead_code)]

fn main() {
    // use js_sys::ArrayBuffer;
    // use js_sys::Uint8Array;
    use libaes::Cipher;
    use std::convert::TryFrom;
    // // use std::str;
    use wasm_bindgen::prelude::*;
    // use wasm_bindgen::JsCast;
    // use wasm_bindgen_futures::JsFuture;
    // use web_sys::{Request, RequestInit, RequestMode, Response};

    // #[wasm_bindgen]
    // extern "C" {
    //     // Use `js_namespace` here to bind `console.log(..)` instead of just
    //     // `log(..)`
    //     #[wasm_bindgen(js_namespace = console)]
    //     fn log(s: &str);

    //     // The `console.log` is quite polymorphic, so we can bind it with multiple
    //     // signatures. Note that we need to use `js_name` to ensure we always call
    //     // `log` in JS.
    //     #[wasm_bindgen(js_namespace = console, js_name = log)]
    //     fn log_u32(a: u32);

    //     // Multiple arguments too!
    //     #[wasm_bindgen(js_namespace = console, js_name = log)]
    //     fn log_many(a: &str, b: &str);
    // }

    // macro_rules! console_log {
    //     // Note that this is using the `log` function imported above during
    //     // `bare_bones`
    //     ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
    // }

    #[wasm_bindgen]
    pub fn aes_cbc(data_in: Vec<u8>, iv_in: Vec<u8>, key_in: Vec<u8>) -> Vec<u8> {
        let key_u8: &[u8] = &key_in;
        let iv: &[u8] = &iv_in;

        let key_u8_16 = <&[u8; 16]>::try_from(key_u8).unwrap();

        let cipher = Cipher::new_128(key_u8_16);

        let decrypted = cipher.cbc_decrypt(iv, &data_in[..]);

        // let decrypted_data = unsafe { js_sys::Uint8Array::view(&decrypted[..]) };
        return decrypted;
    }

    // let max = 255;

    // let mut fake_key = key_in;

    // for n in 0..15 {
    //     fake_key[n] = max - fake_key[n];
    // }

    // // fake_key[0] = max - fake_key[0];
    // // fake_key[1] = max - fake_key[1];
    // // fake_key[2] = max - fake_key[2];
    // // fake_key[3] = max - fake_key[3];
    // // fake_key[4] = max - fake_key[4];
    // // fake_key[5] = max - fake_key[5];
    // // fake_key[6] = max - fake_key[6];
    // // fake_key[7] = max - fake_key[7];
    // // fake_key[8] = max - fake_key[8];
    // // fake_key[9] = max - fake_key[9];
    // // fake_key[10] = max - fake_key[10];
    // // fake_key[11] = max - fake_key[11];
    // // fake_key[12] = max - fake_key[12];
    // // fake_key[13] = max - fake_key[13];
    // // fake_key[14] = max - fake_key[14];
    // // fake_key[15] = max - fake_key[15];

    // let mut real_key = Vec::new();
    // real_key.push(fake_key[2]);
    // real_key.push(fake_key[12]);
    // real_key.push(fake_key[6]);
    // real_key.push(fake_key[15]);
    // real_key.push(fake_key[0]);
    // real_key.push(fake_key[7]);
    // real_key.push(fake_key[4]);
    // real_key.push(fake_key[14]);
    // real_key.push(fake_key[8]);
    // real_key.push(fake_key[5]);
    // real_key.push(fake_key[9]);
    // real_key.push(fake_key[10]);
    // real_key.push(fake_key[13]);
    // real_key.push(fake_key[1]);
    // real_key.push(fake_key[11]);
    // real_key.push(fake_key[3]);

    // console_log!("{:?}", real_key);

    // pub async fn fetch_data() -> Vec<u8> {
    //     let mut opts = RequestInit::new();
    //     opts.method("GET");
    //     opts.mode(RequestMode::Cors);

    //     let url = format!("http://localhost:8000/480-0.ts");

    //     let request = Request::new_with_str_and_init(&url, &opts);
    //     let request = match request {
    //         Ok(request) => request,
    //         Err(error) => panic!("Problem while fetching data: {:?}", error),
    //     };
    //     let set_header = request.headers().set("Accept", "application/json");

    //     let window = web_sys::window().unwrap();

    //     let resp_value = JsFuture::from(window.fetch_with_request(&request)).await;
    //     let resp_value = match resp_value {
    //         Ok(resp_value) => resp_value,
    //         Err(error) => panic!("Problem while fetching data: {:?}", error),
    //     };

    //     // let is_instance_of_res = assert!(resp_value.is_instance_of::<Response>());
    //     let resp: Response = resp_value.dyn_into().unwrap();

    //     // All lines of code above has a purpose of making API req,
    //     // and below is data type conversion

    //     // convert response value to buffer promise
    //     let bf = resp.array_buffer();
    //     let bf = match bf {
    //         Ok(bf) => bf,
    //         Err(error) => panic!("Problem while converting data to arr buffer: {:?}", error),
    //     };

    //     // convert buffer promise to JS ArrayBuffer
    //     let js_buffer = JsFuture::from(bf).await;
    //     let js_buffer = match js_buffer {
    //         Ok(js_buffer) => js_buffer,
    //         Err(error) => panic!("Problem while converting data to arr buffer: {:?}", error),
    //     };

    //     // convert JS ArrayBuffer to js_sys::ArrayBuffer
    //     let arr_buffer: ArrayBuffer = js_buffer.dyn_into().unwrap();

    //     // convert js_sys::ArrayBuffer -> js_sys::Uint8Array -> Vec<u8>
    //     return Uint8Array::new(&arr_buffer).to_vec();
    // }

    // #[wasm_bindgen]
    // pub fn aes_cbc2(data_in: Vec<u8>, iv_in: Vec<u8>, key_in: Vec<u8>) -> Vec<u8> {
    //     // let data_in = fetch_data().await;

    //     // console_log!("data_in {:?}", data_in);
    //     let key_u8: &[u8] = &key_in;
    //     // console_log!("key_u8 {:?} \nkey_u8.length {:?}", key_u8, key_u8.len());
    //     // let x = b"This is the key!";
    //     let iv: &[u8] = &iv_in;
    //     // console_log!("iv {:?}", iv);

    //     let key_u8_16 = <&[u8; 16]>::try_from(key_u8).unwrap();
    //     // console_log!("key_u8_16 {:?}", key_u8_16);
    //     // let my_key = b"3Cpzd4djjXoi6WEzTqFJIw==";
    //     // let iv = b"this is t=he ivhe ivsss=";

    //     let cipher = Cipher::new_128(key_u8_16);
    //     // console_log!("passed cipher...");

    //     // let encrypted = data_in.as_bytes().to_vec();
    //     // let encrypted = String::from_utf8(data_in).unwrap();
    //     // let encrypted = cipher.cbc_encrypt(iv, plaintext);

    //     let decrypted = cipher.cbc_decrypt(iv, &data_in[..]);
    //     return decrypted;
    //     // return js_array_from_vec(array);

    //     // console_log!("decrypted passed: {:?}", decrypted);

    //     // let decrypted_msg = std::str::from_utf8(&decrypted);

    //     // let res = String::from_utf8_lossy(pt);
    //     // console_log!("is equal: {:?}", res == String::from_utf8_lossy(plaintext));

    //     // Ok(())
    // }

    //* fetching data using reqwest
    // #[wasm_bindgen]
    // pub async fn fetch_data() {
    //     let res = reqwest::Client::new()
    //         .get("http://localhost:8000/480-0.ts")
    //         .header("Accept", "application/json")
    //         .send()
    //         .await;
    //     let res = match res {
    //         Ok(res) => res,
    //         Err(error) => panic!("Problem fetching data: {:?}", error),
    //     };

    //     let text = res.bytes().await;
    //     let text = match text {
    //         Ok(text) => text,
    //         Err(error) => panic!("Problem converting data: {:?}", error),
    //     };

    //     console_log!("branch_info {:?}", text.to_vec());

    //     // Ok(JsValue::from_serde(&branch_info).unwrap())
    // }

    //* create a html element
    // #[wasm_bindgen]
    // pub fn run2(res: String) -> Result<(), JsValue> {
    //     // Use `web_sys`'s global `window` function to get a handle on the global
    //     // window object.
    //     let window = web_sys::window().expect("no global `window` exists");
    //     let document = window.document().expect("should have a document on window");
    //     let body = document.body().expect("document should have a body");

    //     // Manufacture the element we're gonna append
    //     let val = document.create_element("p")?;
    //     val.set_text_content(Some("Hello from Rust!"));

    //     body.append_child(&val)?;

    //     Ok(())
    // }
}
