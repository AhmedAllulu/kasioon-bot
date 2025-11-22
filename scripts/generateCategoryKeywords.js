const fs = require('fs');
const path = require('path');

/**
 * Script to generate category keywords file from API category data
 * Preserves existing keywords and adds new leaf categories from API
 */

// The JSON data provided by the user
const categoryData = {
    "success": true,
    "message": "Categories retrieved successfully",
    "data": {
      "categories": [
        {
          "id": "00000000-0000-0000-0000-000000000000",
          "slug": "real-estate",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752733964683-9db3923a-ebe8-465c-9b52-b838bb5903ad.webp",
          "image": null,
          "sort_order": 1,
          "level": 0,
          "name": "عقار",
          "description": "ابحث عن عقارك المثالي في سوريا. تصفح مجموعة واسعة من الشقق، الفلل، المحلات التجارية، المكاتب، والأراضي للبيع أو الإيجار. منزلك أو استثمارك القادم على بعد نقرة واحدة.",
          "children": [
            {
              "id": "33333333-3333-3333-3333-333333333333",
              "slug": "land",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734323969-5a0bfcd8-b9e7-434b-8876-2a930346d86c.webp",
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "أراضي",
              "description": "أراضي وقطع للتطوير",
              "children": []
            },
            {
              "id": "22222222-2222-2222-2222-222222222222",
              "slug": "commercial",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752733994190-25773bb2-9d17-4921-a73d-e5031c93af5f.webp",
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "تجاري",
              "description": "عقارات تجارية للأعمال",
              "children": []
            },
            {
              "id": "55555555-5555-5555-5555-555555555555",
              "slug": "special-properties",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734518622-e55d9a98-adb0-465b-a1c3-1a2006c0c8bc.webp",
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "عقارات مميزة",
              "description": "عقارات فريدة وفاخرة",
              "children": []
            },
            {
              "id": "44444444-4444-4444-4444-444444444444",
              "slug": "industrial",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734081666-45dc6127-f591-4369-bb9d-a71ab13b2de1.webp",
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "صناعي",
              "description": "عقارات ومرافق صناعية",
              "children": []
            },
            {
              "id": "11111111-1111-1111-1111-111111111111",
              "slug": "residential",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752733951592-0a8b291a-16ce-428e-89d4-0356479410f3.webp",
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "سكني",
              "description": "عقارات سكنية للسكن",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000002",
          "slug": "vehicles",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734612787-a3766144-fa9f-4d88-9683-0516b8e7e53b.webp",
          "image": null,
          "sort_order": 2,
          "level": 0,
          "name": "مركبة",
          "description": "اكتشف مجموعة واسعة من السيارات الجديدة والمستعملة، الدراجات النارية، والمركبات التجارية للبيع في سوريا. اعثر على المركبة المثالية التي تناسب احتياجاتك وميزانيتك.",
          "children": [
            {
              "id": "00000000-0000-0000-0002-000000000004",
              "slug": "motorcycles",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752565150953-ac9fbc8e-4b29-4925-8e7f-fc5c5aab5902.webp",
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "الدراجات النارية",
              "description": "بيع وشراء الدراجات النارية والسكوترات في سوريا.",
              "children": [
                {
                  "id": "86f31e7a-b6b3-4b91-9222-0ae61cb71558",
                  "slug": "akkad",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "عقاد",
                  "description": "تصفح إعلاناتنا لمركبات عقاد",
                  "children": []
                },
                {
                  "id": "3e052a4d-62d0-40db-88a3-b31cffd5e1b8",
                  "slug": "aprilia",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "أبريليا",
                  "description": "تصفح إعلاناتنا لمركبات أبريليا",
                  "children": []
                },
                {
                  "id": "9f0f2062-e70c-436c-b0dd-d81712e05c23",
                  "slug": "arora",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "أرورا",
                  "description": "تصفح إعلاناتنا لمركبات أرورا",
                  "children": []
                },
                {
                  "id": "a61bc425-543e-47ee-abd5-56571544a4af",
                  "slug": "bsa",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "بي إس إيه",
                  "description": "تصفح إعلاناتنا لمركبات بي إس إيه",
                  "children": []
                },
                {
                  "id": "7680dd52-248b-411b-80d4-b58e17bdb0e4",
                  "slug": "bajaj",
                  "icon": null,
                  "image": null,
                  "sort_order": 5,
                  "level": 2,
                  "name": "باجاج",
                  "description": "تصفح إعلاناتنا لمركبات باجاج",
                  "children": []
                },
                {
                  "id": "bfa9c427-b5d9-4963-b9a1-2aaba6668e0e",
                  "slug": "bajaj-three-wheeler",
                  "icon": null,
                  "image": null,
                  "sort_order": 6,
                  "level": 2,
                  "name": "بجاج ثلاث عجلات",
                  "description": "تصفح إعلاناتنا لمركبات بجاج ثلاث عجلات",
                  "children": []
                },
                {
                  "id": "8191b80b-89c1-4713-bc96-d3194b783416",
                  "slug": "benelli",
                  "icon": null,
                  "image": null,
                  "sort_order": 7,
                  "level": 2,
                  "name": "بينيلي",
                  "description": "تصفح إعلاناتنا لمركبات بينيلي",
                  "children": []
                },
                {
                  "id": "04677006-9d5d-4ccf-a031-382438a48a13",
                  "slug": "bisan",
                  "icon": null,
                  "image": null,
                  "sort_order": 8,
                  "level": 2,
                  "name": "بيسان",
                  "description": "تصفح إعلاناتنا لمركبات بيسان",
                  "children": []
                },
                {
                  "id": "a4bc798a-190d-41ff-9195-a52021cdaf6d",
                  "slug": "cfmoto",
                  "icon": null,
                  "image": null,
                  "sort_order": 9,
                  "level": 2,
                  "name": "سي اف موتو",
                  "description": "تصفح إعلاناتنا لمركبات سي اف موتو",
                  "children": []
                },
                {
                  "id": "cd77c76b-a3d0-44db-a712-5e361c25d489",
                  "slug": "cfmoto-atv",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "سي اف موتو دباب",
                  "description": "تصفح إعلاناتنا لمركبات سي اف موتو دباب",
                  "children": []
                },
                {
                  "id": "6ced1562-58bc-4338-b8f9-76759483f024",
                  "slug": "cg",
                  "icon": null,
                  "image": null,
                  "sort_order": 11,
                  "level": 2,
                  "name": "سي جي",
                  "description": "تصفح إعلاناتنا لمركبات سي جي",
                  "children": []
                },
                {
                  "id": "84f98034-739f-4981-95e8-39f4408625ac",
                  "slug": "can-am",
                  "icon": null,
                  "image": null,
                  "sort_order": 12,
                  "level": 2,
                  "name": "كان آم",
                  "description": "تصفح إعلاناتنا لمركبات كان آم",
                  "children": []
                },
                {
                  "id": "540c5271-3b34-4be4-8e87-a7e8f2c4441d",
                  "slug": "cobra",
                  "icon": null,
                  "image": null,
                  "sort_order": 13,
                  "level": 2,
                  "name": "كوبرا",
                  "description": "تصفح إعلاناتنا لمركبات كوبرا",
                  "children": []
                },
                {
                  "id": "8408fc0e-0196-4248-a2bf-bb105a90cfb1",
                  "slug": "dayun",
                  "icon": null,
                  "image": null,
                  "sort_order": 14,
                  "level": 2,
                  "name": "دايون",
                  "description": "تصفح إعلاناتنا لمركبات دايون",
                  "children": []
                },
                {
                  "id": "c797efff-7947-4015-86c2-50ee20c50d50",
                  "slug": "ducati",
                  "icon": null,
                  "image": null,
                  "sort_order": 15,
                  "level": 2,
                  "name": "دوكاتي",
                  "description": "تصفح إعلاناتنا لمركبات دوكاتي",
                  "children": []
                },
                {
                  "id": "d1590822-4e09-44fa-9ba7-c918145eb59f",
                  "slug": "e-bike",
                  "icon": null,
                  "image": null,
                  "sort_order": 16,
                  "level": 2,
                  "name": "دراجة كهربائية",
                  "description": "تصفح إعلاناتنا لمركبات دراجة كهربائية",
                  "children": []
                },
                {
                  "id": "82abd4fd-328a-452c-9931-a234a85d7f1d",
                  "slug": "e-scooter",
                  "icon": null,
                  "image": null,
                  "sort_order": 17,
                  "level": 2,
                  "name": "سكوتر كهربائي",
                  "description": "تصفح إعلاناتنا لمركبات سكوتر كهربائي",
                  "children": []
                },
                {
                  "id": "6dd8c411-2255-42a4-bed2-349f72635329",
                  "slug": "haojue",
                  "icon": null,
                  "image": null,
                  "sort_order": 18,
                  "level": 2,
                  "name": "هاوجو",
                  "description": "تصفح إعلاناتنا لمركبات هاوجو",
                  "children": []
                },
                {
                  "id": "6b3ed2c4-3be4-4f8a-99fb-dfb6800ca3b3",
                  "slug": "hawa",
                  "icon": null,
                  "image": null,
                  "sort_order": 19,
                  "level": 2,
                  "name": "هوا",
                  "description": "تصفح إعلاناتنا لمركبات هوا",
                  "children": []
                },
                {
                  "id": "310a6290-4ee8-4c88-896b-cb449efcd03e",
                  "slug": "hero",
                  "icon": null,
                  "image": null,
                  "sort_order": 20,
                  "level": 2,
                  "name": "هيرو",
                  "description": "تصفح إعلاناتنا لمركبات هيرو",
                  "children": []
                },
                {
                  "id": "cef321bd-30b4-4219-96e5-aaea7ddd7c66",
                  "slug": "honda-atv",
                  "icon": null,
                  "image": null,
                  "sort_order": 21,
                  "level": 2,
                  "name": "هوندا دباب",
                  "description": "تصفح إعلاناتنا لمركبات هوندا دباب",
                  "children": []
                },
                {
                  "id": "4220e20e-2789-4ed1-aa2e-39fcf1420c89",
                  "slug": "honda-classic",
                  "icon": null,
                  "image": null,
                  "sort_order": 22,
                  "level": 2,
                  "name": "هوندا كلاسيك",
                  "description": "تصفح إعلاناتنا لمركبات هوندا كلاسيك",
                  "children": []
                },
                {
                  "id": "025053a5-7d1a-4f81-afc7-86046451f094",
                  "slug": "honda-scooter",
                  "icon": null,
                  "image": null,
                  "sort_order": 23,
                  "level": 2,
                  "name": "سكوتر هوندا",
                  "description": "تصفح إعلاناتنا لمركبات سكوتر هوندا",
                  "children": []
                },
                {
                  "id": "39edd3e6-2933-4b35-9c5b-16967dbd8076",
                  "slug": "husqvarna",
                  "icon": null,
                  "image": null,
                  "sort_order": 24,
                  "level": 2,
                  "name": "هوسكفارنا",
                  "description": "تصفح إعلاناتنا لمركبات هوسكفارنا",
                  "children": []
                },
                {
                  "id": "829fb1db-3785-4b8f-87a7-553c878f6971",
                  "slug": "jawa",
                  "icon": null,
                  "image": null,
                  "sort_order": 25,
                  "level": 2,
                  "name": "جاوا",
                  "description": "تصفح إعلاناتنا لمركبات جاوا",
                  "children": []
                },
                {
                  "id": "6dd30067-ab5f-40c9-b638-361d90cc90e6",
                  "slug": "jianshe",
                  "icon": null,
                  "image": null,
                  "sort_order": 26,
                  "level": 2,
                  "name": "جيانشي",
                  "description": "تصفح إعلاناتنا لمركبات جيانشي",
                  "children": []
                },
                {
                  "id": "122539fd-4958-40ba-ba76-f1350cc66190",
                  "slug": "ktm",
                  "icon": null,
                  "image": null,
                  "sort_order": 27,
                  "level": 2,
                  "name": "كي تي إم",
                  "description": "تصفح إعلاناتنا لمركبات كي تي إم",
                  "children": []
                },
                {
                  "id": "174c9d09-5e35-4d43-adea-47341f5c81c0",
                  "slug": "kavir",
                  "icon": null,
                  "image": null,
                  "sort_order": 28,
                  "level": 2,
                  "name": "كوير",
                  "description": "تصفح إعلاناتنا لمركبات كوير",
                  "children": []
                },
                {
                  "id": "1e25829e-c274-44e7-ba79-1fbdc1e10ff6",
                  "slug": "kawasaki",
                  "icon": null,
                  "image": null,
                  "sort_order": 29,
                  "level": 2,
                  "name": "كاواساكي",
                  "description": "تصفح إعلاناتنا لمركبات كاواساكي",
                  "children": []
                },
                {
                  "id": "01023090-01a7-48d3-b89d-71584ba99db6",
                  "slug": "keeway",
                  "icon": null,
                  "image": null,
                  "sort_order": 30,
                  "level": 2,
                  "name": "كي واي",
                  "description": "تصفح إعلاناتنا لمركبات كي واي",
                  "children": []
                },
                {
                  "id": "28908d5b-bff7-4ea6-947c-ec39485206e4",
                  "slug": "kymco",
                  "icon": null,
                  "image": null,
                  "sort_order": 31,
                  "level": 2,
                  "name": "كيمكو",
                  "description": "تصفح إعلاناتنا لمركبات كيمكو",
                  "children": []
                },
                {
                  "id": "8fc3782f-90c6-4aa5-9ec6-d4b3cfd1cb48",
                  "slug": "loncin",
                  "icon": null,
                  "image": null,
                  "sort_order": 32,
                  "level": 2,
                  "name": "لونسين",
                  "description": "تصفح إعلاناتنا لمركبات لونسين",
                  "children": []
                },
                {
                  "id": "39507508-532b-4e29-bc3c-3ea587890e9b",
                  "slug": "mondial",
                  "icon": null,
                  "image": null,
                  "sort_order": 33,
                  "level": 2,
                  "name": "مونديال",
                  "description": "تصفح إعلاناتنا لمركبات مونديال",
                  "children": []
                },
                {
                  "id": "a5005ec9-9664-451a-a9af-0f820527098b",
                  "slug": "moto-guzzi",
                  "icon": null,
                  "image": null,
                  "sort_order": 34,
                  "level": 2,
                  "name": "موتو جوزي",
                  "description": "تصفح إعلاناتنا لمركبات موتو جوزي",
                  "children": []
                },
                {
                  "id": "f320d0ec-4c82-4680-aa1f-20dfd84c9df8",
                  "slug": "norton",
                  "icon": null,
                  "image": null,
                  "sort_order": 35,
                  "level": 2,
                  "name": "نورتون",
                  "description": "تصفح إعلاناتنا لمركبات نورتون",
                  "children": []
                },
                {
                  "id": "dfeda79d-b84c-404f-9f6d-0e3fcfc98428",
                  "slug": "part",
                  "icon": null,
                  "image": null,
                  "sort_order": 36,
                  "level": 2,
                  "name": "بارت",
                  "description": "تصفح إعلاناتنا لمركبات بارت",
                  "children": []
                },
                {
                  "id": "77d1de3d-ee98-4bbe-b7ec-b0bb993ed241",
                  "slug": "piaggio-three-wheeler",
                  "icon": null,
                  "image": null,
                  "sort_order": 37,
                  "level": 2,
                  "name": "بياجيو ثلاث عجلات",
                  "description": "تصفح إعلاناتنا لمركبات بياجيو ثلاث عجلات",
                  "children": []
                },
                {
                  "id": "db8af388-e887-4163-b7ee-176348a6c12d",
                  "slug": "polaris",
                  "icon": null,
                  "image": null,
                  "sort_order": 38,
                  "level": 2,
                  "name": "بولاريس",
                  "description": "تصفح إعلاناتنا لمركبات بولاريس",
                  "children": []
                },
                {
                  "id": "96b1b664-496f-454b-8350-7b6d6e5557c0",
                  "slug": "qjmotor",
                  "icon": null,
                  "image": null,
                  "sort_order": 39,
                  "level": 2,
                  "name": "كيو جيه موتور",
                  "description": "تصفح إعلاناتنا لمركبات كيو جيه موتور",
                  "children": []
                },
                {
                  "id": "1dfd844e-b9f0-4cff-9309-62cacb9706f2",
                  "slug": "qlink",
                  "icon": null,
                  "image": null,
                  "sort_order": 40,
                  "level": 2,
                  "name": "كيو لينك",
                  "description": "تصفح إعلاناتنا لمركبات كيو لينك",
                  "children": []
                },
                {
                  "id": "6b5bc9c8-da51-47fe-a42a-3b3f68f56ea2",
                  "slug": "rks",
                  "icon": null,
                  "image": null,
                  "sort_order": 41,
                  "level": 2,
                  "name": "آر كيه إس",
                  "description": "تصفح إعلاناتنا لمركبات آر كيه إس",
                  "children": []
                },
                {
                  "id": "8b3a7214-1aa9-49fa-9ae5-c359f923a675",
                  "slug": "rato",
                  "icon": null,
                  "image": null,
                  "sort_order": 42,
                  "level": 2,
                  "name": "راتو",
                  "description": "تصفح إعلاناتنا لمركبات راتو",
                  "children": []
                },
                {
                  "id": "934ddf8a-02e9-49a0-8209-9a497ea7fa1b",
                  "slug": "rewa",
                  "icon": null,
                  "image": null,
                  "sort_order": 43,
                  "level": 2,
                  "name": "ريوا",
                  "description": "تصفح إعلاناتنا لمركبات ريوا",
                  "children": []
                },
                {
                  "id": "9d60796b-4646-4f5b-9177-ee08adb67272",
                  "slug": "royal-enfield",
                  "icon": null,
                  "image": null,
                  "sort_order": 44,
                  "level": 2,
                  "name": "رويال إنفيلد",
                  "description": "تصفح إعلاناتنا لمركبات رويال إنفيلد",
                  "children": []
                },
                {
                  "id": "7f96cfa9-8272-4302-9b31-902756544c69",
                  "slug": "sym",
                  "icon": null,
                  "image": null,
                  "sort_order": 45,
                  "level": 2,
                  "name": "إس واي إم",
                  "description": "تصفح إعلاناتنا لمركبات إس واي إم",
                  "children": []
                },
                {
                  "id": "30c26a5d-5c33-4e65-8c0f-92517c67ff80",
                  "slug": "shark",
                  "icon": null,
                  "image": null,
                  "sort_order": 46,
                  "level": 2,
                  "name": "شارك",
                  "description": "تصفح إعلاناتنا لمركبات شارك",
                  "children": []
                },
                {
                  "id": "c17e8a98-2c4a-4526-aaac-c80e78734e9e",
                  "slug": "shineray",
                  "icon": null,
                  "image": null,
                  "sort_order": 47,
                  "level": 2,
                  "name": "شينراي",
                  "description": "تصفح إعلاناتنا لمركبات شينراي",
                  "children": []
                },
                {
                  "id": "dec7183b-279f-4d4b-8168-90a6fbf10411",
                  "slug": "skygo",
                  "icon": null,
                  "image": null,
                  "sort_order": 48,
                  "level": 2,
                  "name": "سكاي جو",
                  "description": "تصفح إعلاناتنا لمركبات سكاي جو",
                  "children": []
                },
                {
                  "id": "f40722e3-37dd-4655-ac9f-aea33c82c043",
                  "slug": "suzuki-atv",
                  "icon": null,
                  "image": null,
                  "sort_order": 49,
                  "level": 2,
                  "name": "سوزوكي دباب",
                  "description": "تصفح إعلاناتنا لمركبات سوزوكي دباب",
                  "children": []
                },
                {
                  "id": "8b06d5ee-74c7-4914-87bd-228823c878ae",
                  "slug": "suzuki-classic",
                  "icon": null,
                  "image": null,
                  "sort_order": 50,
                  "level": 2,
                  "name": "سوزوكي كلاسيك",
                  "description": "تصفح إعلاناتنا لمركبات سوزوكي كلاسيك",
                  "children": []
                },
                {
                  "id": "14bd5f9c-39c4-40d4-b3a1-574c31981ce1",
                  "slug": "tvs",
                  "icon": null,
                  "image": null,
                  "sort_order": 51,
                  "level": 2,
                  "name": "تي في اس",
                  "description": "تصفح إعلاناتنا لمركبات تي في اس",
                  "children": []
                },
                {
                  "id": "9e1f2644-23e6-4a59-93f6-8edd6c0c3279",
                  "slug": "tvs-three-wheeler",
                  "icon": null,
                  "image": null,
                  "sort_order": 52,
                  "level": 2,
                  "name": "تي في اس ثلاث عجلات",
                  "description": "تصفح إعلاناتنا لمركبات تي في اس ثلاث عجلات",
                  "children": []
                },
                {
                  "id": "016dc3ea-5c1f-4597-8069-cce83603047e",
                  "slug": "triumph",
                  "icon": null,
                  "image": null,
                  "sort_order": 53,
                  "level": 2,
                  "name": "ترايمف",
                  "description": "تصفح إعلاناتنا لمركبات ترايمف",
                  "children": []
                },
                {
                  "id": "51111e26-ccf4-4e74-8d50-a86a77ac9262",
                  "slug": "vespa",
                  "icon": null,
                  "image": null,
                  "sort_order": 54,
                  "level": 2,
                  "name": "فيسبا",
                  "description": "تصفح إعلاناتنا لمركبات فيسبا",
                  "children": []
                },
                {
                  "id": "7200428b-b695-4903-acf3-270cdd5eae84",
                  "slug": "yamaha",
                  "icon": null,
                  "image": null,
                  "sort_order": 55,
                  "level": 2,
                  "name": "ياماها",
                  "description": "تصفح إعلاناتنا لمركبات ياماها",
                  "children": []
                },
                {
                  "id": "e3b43c75-db9f-47fa-954e-db1c6fef8e69",
                  "slug": "yamaha-atv",
                  "icon": null,
                  "image": null,
                  "sort_order": 56,
                  "level": 2,
                  "name": "ياماها دباب",
                  "description": "تصفح إعلاناتنا لمركبات ياماها دباب",
                  "children": []
                },
                {
                  "id": "90ce53cd-55e7-43df-b430-67ad0bce995a",
                  "slug": "yamasaki",
                  "icon": null,
                  "image": null,
                  "sort_order": 57,
                  "level": 2,
                  "name": "ياماساكي",
                  "description": "تصفح إعلاناتنا لمركبات ياماساكي",
                  "children": []
                },
                {
                  "id": "6143d120-d514-4ba0-b052-a6bae4bd5e5b",
                  "slug": "tayba",
                  "icon": null,
                  "image": null,
                  "sort_order": 58,
                  "level": 2,
                  "name": "طيبة",
                  "description": "استكشف مجموعتنا من مركبات طيبة الجديدة والمستعملة في سوريا.",
                  "children": []
                },
                {
                  "id": "c954f898-fdb7-40ec-af8c-de5718ffef02",
                  "slug": "znen",
                  "icon": null,
                  "image": null,
                  "sort_order": 59,
                  "level": 2,
                  "name": "زينين",
                  "description": "تصفح إعلاناتنا لمركبات زينين",
                  "children": []
                },
                {
                  "id": "4e86470e-9134-4153-acd4-50436c99875c",
                  "slug": "zongshen",
                  "icon": null,
                  "image": null,
                  "sort_order": 60,
                  "level": 2,
                  "name": "زونج شين",
                  "description": "تصفح إعلاناتنا لمركبات زونج شين",
                  "children": []
                },
                {
                  "id": "9a20b7f7-841c-4138-bd4f-83111a1d19c5",
                  "slug": "yamaha-scooter",
                  "icon": null,
                  "image": null,
                  "sort_order": 61,
                  "level": 2,
                  "name": "سكوتر ياماها",
                  "description": "استكشف مجموعتنا من مركبات سكوتر ياماها الجديدة والمستعملة في سوريا.",
                  "children": []
                },
                {
                  "id": "6b4fd9f0-8e3b-4dd2-b1d7-deb33da06fa8",
                  "slug": "moto-other",
                  "icon": null,
                  "image": null,
                  "sort_order": 999,
                  "level": 0,
                  "name": "ماركات أخرى",
                  "description": "",
                  "children": []
                }
              ]
            },
            {
              "id": "00000000-0000-0000-0002-000000000003",
              "slug": "cars",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734572583-dedce3d6-2328-4790-8ec3-52e880668df2.webp",
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "السيارات",
              "description": "",
              "children": [
                {
                  "id": "9eb07eb5-686e-4f37-b20b-ccc7139caab6",
                  "slug": "isuzu",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642228064-22c15a64-8bd6-4938-bfd6-8b3374f79ac8.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "ايسوزو",
                  "description": "مركبات ايسوزو",
                  "children": []
                },
                {
                  "id": "bd916178-0d2a-453d-bb7f-43c2fb536631",
                  "slug": "bmw",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642420228-b30f4a69-d74d-4408-acd1-bdeedbc7f153.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "بي ام دبليو",
                  "description": "مركبات بي ام دبليو",
                  "children": []
                },
                {
                  "id": "e4c652b8-d818-48a5-b824-0b8f99b602d7",
                  "slug": "toyota",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641497379-431e4b97-5a78-4c29-bc2e-10815acdf4a9.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "تويوتا",
                  "description": "مركبات تويوتا",
                  "children": []
                },
                {
                  "id": "ad53d534-b21e-449f-a32a-ee79d46e4bc5",
                  "slug": "gmc",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752581496133-3bb8bbe3-5c15-44b4-a212-3d3c2da97bee.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "جي إم سي",
                  "description": "مركبات جي إم سي",
                  "children": []
                },
                {
                  "id": "cb980bf9-9d2a-427c-9c64-6bbe0eed6d4d",
                  "slug": "jeep",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642158203-23060b0f-8f84-4115-9504-cd0ddd070d52.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "جيب",
                  "description": "مركبات جيب",
                  "children": []
                },
                {
                  "id": "ae0c4315-2d7f-437c-bcb7-a8b42c0659cd",
                  "slug": "ford",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642356274-d919b523-eabc-433f-a22b-39c4e27e74f0.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "فورد",
                  "description": "مركبات فورد",
                  "children": []
                },
                {
                  "id": "b7d1652f-53d3-4a57-bc7c-ff1eca694f6d",
                  "slug": "fiat",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642394553-76e9f43e-595a-40d7-8669-fad68bf55678.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "فيات",
                  "description": "مركبات فيات",
                  "children": []
                },
                {
                  "id": "4e7b6edc-f8e2-45c5-9422-c5badf3ed76e",
                  "slug": "honda",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642317723-dc7e5c0d-b074-43b6-9d55-6dc95b2f20e5.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "هوندا",
                  "description": "مركبات هوندا",
                  "children": []
                },
                {
                  "id": "0d5f2cb7-8a54-41c9-bd5c-cdc4008016de",
                  "slug": "hyundai",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642297502-3cac8d58-61b5-4c5c-abe5-ce3e8fcd065e.webp",
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "هيونداي",
                  "description": "مركبات هيونداي",
                  "children": []
                },
                {
                  "id": "2a519e5c-33ab-47b8-a5f3-a892852aad76",
                  "slug": "audi",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642437128-94529170-6843-43f3-869e-960729a4ef71.webp",
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "أودي",
                  "description": "مركبات أودي",
                  "children": []
                },
                {
                  "id": "f2f02836-020b-4ac4-8749-7cc29550b595",
                  "slug": "skoda",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641650172-2f9eb732-5128-4fe8-adbf-c594b0b6f1fb.webp",
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "سكودا",
                  "description": "مركبات سكودا",
                  "children": []
                },
                {
                  "id": "e1e50750-c9ae-4653-bbe6-e5e88ec384d8",
                  "slug": "volvo",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641369425-ad79269d-22ca-450b-880f-c1120d12571f.webp",
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "فولفو",
                  "description": "مركبات فولفو",
                  "children": []
                },
                {
                  "id": "2a9e9928-568c-4bae-9987-cbf31f8c1565",
                  "slug": "mazda",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642024256-5afdfc4d-a40c-4409-82e1-1b95463c82c5.webp",
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "مازدا",
                  "description": "مركبات مازدا",
                  "children": []
                },
                {
                  "id": "81381cde-0f8f-4a3c-83c9-7462494c057d",
                  "slug": "mercedes-benz",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641999848-5e80da8e-58e4-4cf8-8da5-c7f63385031a.webp",
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "مرسيدس بنز",
                  "description": "مركبات مرسيدس بنز",
                  "children": []
                },
                {
                  "id": "b694fda3-9ba4-481c-b6c8-4a297a321715",
                  "slug": "nissan",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641927492-4dbc8f53-c9c8-415c-a05f-e3142fa9ff12.webp",
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "نيسان",
                  "description": "مركبات نيسان",
                  "children": []
                },
                {
                  "id": "32688d92-4076-41f6-ae4d-1b5b381a7c61",
                  "slug": "avatar",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "افاتار",
                  "description": "مركبات افاتار",
                  "children": []
                },
                {
                  "id": "2c3497bc-3329-497b-8f3e-ef8f6445981f",
                  "slug": "baic",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "بايك",
                  "description": "مركبات بايك",
                  "children": []
                },
                {
                  "id": "927a0f71-c01c-4af4-a8ee-2ade48d958d9",
                  "slug": "aston-martin",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642506161-173efa67-7059-451c-a50e-c279aff79dd6.webp",
                  "image": null,
                  "sort_order": 5,
                  "level": 2,
                  "name": "استون مارتن",
                  "description": "مركبات استون مارتن",
                  "children": []
                },
                {
                  "id": "839ad627-5499-42ee-ab74-6ae7e3f6c3a3",
                  "slug": "bentley",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642458907-782e3570-9b97-4edc-968f-5cfab86b75e9.webp",
                  "image": null,
                  "sort_order": 5,
                  "level": 2,
                  "name": "بنتلي",
                  "description": "مركبات بنتلي",
                  "children": []
                },
                {
                  "id": "4402fca9-8680-449d-b95c-e9387136947e",
                  "slug": "bestune",
                  "icon": null,
                  "image": null,
                  "sort_order": 6,
                  "level": 2,
                  "name": "بستيون",
                  "description": "مركبات بستيون",
                  "children": []
                },
                {
                  "id": "6eaed1a0-1859-4e99-b2f7-c16bf3ddbf7d",
                  "slug": "borgward",
                  "icon": null,
                  "image": null,
                  "sort_order": 8,
                  "level": 2,
                  "name": "بورجوارد",
                  "description": "مركبات بورجوارد",
                  "children": []
                },
                {
                  "id": "3765f305-3c51-4a3e-b6f4-b6edded95b6c",
                  "slug": "buick",
                  "icon": null,
                  "image": null,
                  "sort_order": 9,
                  "level": 2,
                  "name": "بويك",
                  "description": "مركبات بويك",
                  "children": []
                },
                {
                  "id": "8976be10-87fc-4a45-bf10-44c739dd44a5",
                  "slug": "byd",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "بي واي دي",
                  "description": "مركبات بي واي دي",
                  "children": []
                },
                {
                  "id": "dcf107ca-2f0b-4367-a054-d4bc62e0b95e",
                  "slug": "cadillac",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642524660-b27d94ee-3dc8-4c8a-96b0-63340ef42942.webp",
                  "image": null,
                  "sort_order": 11,
                  "level": 2,
                  "name": "كاديلاك",
                  "description": "مركبات كاديلاك",
                  "children": []
                },
                {
                  "id": "0b559a4b-086d-466e-8ef7-9da4ac63f501",
                  "slug": "changan",
                  "icon": null,
                  "image": null,
                  "sort_order": 12,
                  "level": 2,
                  "name": "شانجان",
                  "description": "مركبات شانجان",
                  "children": []
                },
                {
                  "id": "c1d56733-bb30-477c-b353-5d6c939347cf",
                  "slug": "chery",
                  "icon": null,
                  "image": null,
                  "sort_order": 13,
                  "level": 2,
                  "name": "شيري",
                  "description": "مركبات شيري",
                  "children": []
                },
                {
                  "id": "59c6a4ea-4d30-4fff-a3e5-98aa49a59515",
                  "slug": "chevrolet",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642566674-3e3753d2-4ac3-4a4c-b65c-785b77dda5fb.webp",
                  "image": null,
                  "sort_order": 14,
                  "level": 2,
                  "name": "شيفروليه",
                  "description": "مركبات شيفروليه",
                  "children": []
                },
                {
                  "id": "22a75acf-6bfa-4ccc-b7b0-1270f8d7fed6",
                  "slug": "chrysler",
                  "icon": null,
                  "image": null,
                  "sort_order": 15,
                  "level": 2,
                  "name": "كرايسلر",
                  "description": "مركبات كرايسلر",
                  "children": []
                },
                {
                  "id": "46b93df9-43c5-4667-9086-eb25dd1c180c",
                  "slug": "citroen",
                  "icon": null,
                  "image": null,
                  "sort_order": 16,
                  "level": 2,
                  "name": "ستيروين",
                  "description": "مركبات ستيروين",
                  "children": []
                },
                {
                  "id": "01a844f3-5476-4847-a752-34fc2978d360",
                  "slug": "daewoo",
                  "icon": null,
                  "image": null,
                  "sort_order": 17,
                  "level": 2,
                  "name": "دايو",
                  "description": "مركبات دايو",
                  "children": []
                },
                {
                  "id": "e98a2362-0373-4d13-9cf7-29e809dced77",
                  "slug": "daihatsu",
                  "icon": null,
                  "image": null,
                  "sort_order": 18,
                  "level": 2,
                  "name": "دايهاتسو",
                  "description": "مركبات دايهاتسو",
                  "children": []
                },
                {
                  "id": "eaa832cc-d0a3-4f05-b8a7-0238cb1eb200",
                  "slug": "dfm",
                  "icon": null,
                  "image": null,
                  "sort_order": 19,
                  "level": 2,
                  "name": "دي اف ام",
                  "description": "مركبات دي اف ام",
                  "children": []
                },
                {
                  "id": "a4d4d177-ec80-4e89-8e8e-cb1a4753250f",
                  "slug": "dfsk",
                  "icon": null,
                  "image": null,
                  "sort_order": 20,
                  "level": 2,
                  "name": "دي اف اس كي",
                  "description": "مركبات دي اف اس كي",
                  "children": []
                },
                {
                  "id": "11ce45f3-0325-4bac-a7ac-114f044adad6",
                  "slug": "dodge",
                  "icon": null,
                  "image": null,
                  "sort_order": 21,
                  "level": 2,
                  "name": "دودج",
                  "description": "مركبات دودج",
                  "children": []
                },
                {
                  "id": "2b95b13d-d477-486c-94b3-c76f0fa30887",
                  "slug": "dongfeng",
                  "icon": null,
                  "image": null,
                  "sort_order": 22,
                  "level": 2,
                  "name": "دونج فينج",
                  "description": "مركبات دونج فينج",
                  "children": []
                },
                {
                  "id": "788ee5d2-d827-493d-87db-eb76543154b5",
                  "slug": "faw",
                  "icon": null,
                  "image": null,
                  "sort_order": 23,
                  "level": 2,
                  "name": "فاو",
                  "description": "مركبات فاو",
                  "children": []
                },
                {
                  "id": "c452380b-1aa6-4157-bc75-004efe707059",
                  "slug": "ferrari",
                  "icon": null,
                  "image": null,
                  "sort_order": 24,
                  "level": 2,
                  "name": "فيراري",
                  "description": "مركبات فيراري",
                  "children": []
                },
                {
                  "id": "9a702928-4cc0-4a42-8bc9-9a8cd19748fa",
                  "slug": "forthing-2",
                  "icon": null,
                  "image": null,
                  "sort_order": 27,
                  "level": 2,
                  "name": "فورثينج",
                  "description": "مركبات فورثينج",
                  "children": []
                },
                {
                  "id": "a32874c1-1a22-4395-9011-4186d2ad2d9a",
                  "slug": "foton",
                  "icon": null,
                  "image": null,
                  "sort_order": 28,
                  "level": 2,
                  "name": "فوتون",
                  "description": "مركبات فوتون",
                  "children": []
                },
                {
                  "id": "d3e4a2eb-6dd5-4bbf-90e5-618b99b3fb9d",
                  "slug": "gac",
                  "icon": null,
                  "image": null,
                  "sort_order": 29,
                  "level": 2,
                  "name": "جي أيه سي",
                  "description": "مركبات جي أيه سي",
                  "children": []
                },
                {
                  "id": "178c8949-1a80-4103-8c80-0a6a9afb5b69",
                  "slug": "geely",
                  "icon": null,
                  "image": null,
                  "sort_order": 30,
                  "level": 2,
                  "name": "جيلي",
                  "description": "مركبات جيلي",
                  "children": []
                },
                {
                  "id": "c7979165-d2aa-4316-ad4c-32ab989fed96",
                  "slug": "genesis",
                  "icon": null,
                  "image": null,
                  "sort_order": 31,
                  "level": 2,
                  "name": "جينيسيس",
                  "description": "مركبات جينيسيس",
                  "children": []
                },
                {
                  "id": "39d3128d-bc1e-466d-a1ef-d9bd65e16548",
                  "slug": "great-wall",
                  "icon": null,
                  "image": null,
                  "sort_order": 33,
                  "level": 2,
                  "name": "جريت وول",
                  "description": "مركبات جريت وول",
                  "children": []
                },
                {
                  "id": "d91f01dc-eb8f-451d-9385-f002f2d00b25",
                  "slug": "haval",
                  "icon": null,
                  "image": null,
                  "sort_order": 34,
                  "level": 2,
                  "name": "هافال",
                  "description": "مركبات هافال",
                  "children": []
                },
                {
                  "id": "0fdca416-154a-4757-823c-d808196526d6",
                  "slug": "hawtai",
                  "icon": null,
                  "image": null,
                  "sort_order": 35,
                  "level": 2,
                  "name": "هاوتاي",
                  "description": "مركبات هاوتاي",
                  "children": []
                },
                {
                  "id": "b93aa827-0563-4bfc-8f8e-538d8db1a999",
                  "slug": "hongqi",
                  "icon": null,
                  "image": null,
                  "sort_order": 37,
                  "level": 2,
                  "name": "هونج تشي",
                  "description": "مركبات هونج تشي",
                  "children": []
                },
                {
                  "id": "d0afee6c-68a4-459f-a4d5-9c602031e36c",
                  "slug": "hummer-1",
                  "icon": null,
                  "image": null,
                  "sort_order": 38,
                  "level": 2,
                  "name": "هامر",
                  "description": "مركبات هامر",
                  "children": []
                },
                {
                  "id": "09d272c2-49e4-46ac-b6e9-614f165c40ac",
                  "slug": "hunaghai",
                  "icon": null,
                  "image": null,
                  "sort_order": 39,
                  "level": 2,
                  "name": "هونغهاي",
                  "description": "مركبات هونغهاي",
                  "children": []
                },
                {
                  "id": "1f916e44-c64f-4400-ae21-baed0dff68cd",
                  "slug": "im",
                  "icon": null,
                  "image": null,
                  "sort_order": 41,
                  "level": 2,
                  "name": "آي إم",
                  "description": "مركبات آي إم",
                  "children": []
                },
                {
                  "id": "6856cdf4-04ef-4e3d-8100-f155f0758c1c",
                  "slug": "ineos",
                  "icon": null,
                  "image": null,
                  "sort_order": 42,
                  "level": 2,
                  "name": "اينوس",
                  "description": "مركبات اينوس",
                  "children": []
                },
                {
                  "id": "ae752256-2bb1-4c14-8684-90859d540a28",
                  "slug": "infiniti",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642246738-90095ed3-7057-4295-a5a5-1178e8fb8853.jpg",
                  "image": null,
                  "sort_order": 43,
                  "level": 2,
                  "name": "إنفينيتي",
                  "description": "مركبات إنفينيتي",
                  "children": []
                },
                {
                  "id": "6fddeebe-91ec-4817-9881-eaaae5a5fb5a",
                  "slug": "iran-khodro",
                  "icon": null,
                  "image": null,
                  "sort_order": 44,
                  "level": 2,
                  "name": "ايران خودرو",
                  "description": "مركبات ايران خودرو",
                  "children": []
                },
                {
                  "id": "09956d6d-9ea4-4995-9e97-60d2f3c08554",
                  "slug": "jac",
                  "icon": null,
                  "image": null,
                  "sort_order": 46,
                  "level": 2,
                  "name": "جاك",
                  "description": "مركبات جاك",
                  "children": []
                },
                {
                  "id": "8e7683cd-5cc3-4ca8-9ab4-68d891225cbe",
                  "slug": "jaguar",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642185469-509f15cd-9303-494b-b513-9000851118ff.webp",
                  "image": null,
                  "sort_order": 47,
                  "level": 2,
                  "name": "جاكوار",
                  "description": "مركبات جاكوار",
                  "children": []
                },
                {
                  "id": "bd767a03-8451-42a7-82aa-3237a723ee22",
                  "slug": "jetour",
                  "icon": null,
                  "image": null,
                  "sort_order": 49,
                  "level": 2,
                  "name": "جيتور",
                  "description": "مركبات جيتور",
                  "children": []
                },
                {
                  "id": "d44e2094-b2f3-4e68-9740-a212e656366e",
                  "slug": "jmc",
                  "icon": null,
                  "image": null,
                  "sort_order": 50,
                  "level": 2,
                  "name": "جاي ام سي",
                  "description": "مركبات جاي ام سي",
                  "children": []
                },
                {
                  "id": "e3bebf1f-9c7e-428d-867a-8fb3dc4ba6a8",
                  "slug": "jmev",
                  "icon": null,
                  "image": null,
                  "sort_order": 51,
                  "level": 2,
                  "name": "جاي ام اي في",
                  "description": "مركبات جاي ام اي في",
                  "children": []
                },
                {
                  "id": "d04678cb-b5eb-4d94-894b-c3750553ee35",
                  "slug": "kaiyi",
                  "icon": null,
                  "image": null,
                  "sort_order": 52,
                  "level": 2,
                  "name": "كايي",
                  "description": "مركبات كايي",
                  "children": []
                },
                {
                  "id": "9a138104-16de-4d83-b39f-83175e5d8ca0",
                  "slug": "kia",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752581445606-3fb9df88-6be9-4faa-bb07-88d70b5ae622.webp",
                  "image": null,
                  "sort_order": 53,
                  "level": 2,
                  "name": "كيا",
                  "description": "مركبات كيا",
                  "children": []
                },
                {
                  "id": "586f4414-7335-47c6-bf03-59d6795d5c5c",
                  "slug": "lada",
                  "icon": null,
                  "image": null,
                  "sort_order": 54,
                  "level": 2,
                  "name": "لادا",
                  "description": "مركبات لادا",
                  "children": []
                },
                {
                  "id": "7185b556-eb8b-44fd-b0d5-fe9e8209f842",
                  "slug": "lamborghini",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642125098-e7483b1b-6dc5-4f12-9626-4a16521e86d5.webp",
                  "image": null,
                  "sort_order": 55,
                  "level": 2,
                  "name": "لامبورغيني",
                  "description": "مركبات لامبورغيني",
                  "children": []
                },
                {
                  "id": "02890b37-de42-4d84-82fb-b9be67e5241b",
                  "slug": "lancia",
                  "icon": null,
                  "image": null,
                  "sort_order": 56,
                  "level": 2,
                  "name": "لانسيا",
                  "description": "مركبات لانسيا",
                  "children": []
                },
                {
                  "id": "c9923dfc-3df7-4def-91de-978194153cf1",
                  "slug": "land-rover",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642077294-39672343-6112-4608-93db-0c7300695b41.webp",
                  "image": null,
                  "sort_order": 57,
                  "level": 2,
                  "name": "لاند روفر",
                  "description": "مركبات لاند روفر",
                  "children": []
                },
                {
                  "id": "33f93ece-01b6-4de6-961f-b8371129a76a",
                  "slug": "leapmotor",
                  "icon": null,
                  "image": null,
                  "sort_order": 58,
                  "level": 2,
                  "name": "ليب موتور",
                  "description": "مركبات ليب موتور",
                  "children": []
                },
                {
                  "id": "edceae79-664d-4437-bce7-7caaabf465b8",
                  "slug": "lexus",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642046315-25062394-5249-48e9-a573-cce1420cf3c9.webp",
                  "image": null,
                  "sort_order": 59,
                  "level": 2,
                  "name": "لكزس",
                  "description": "مركبات لكزس",
                  "children": []
                },
                {
                  "id": "4571247f-592d-46cc-b14d-4a98c633890a",
                  "slug": "lifan",
                  "icon": null,
                  "image": null,
                  "sort_order": 60,
                  "level": 2,
                  "name": "ليفان",
                  "description": "مركبات ليفان",
                  "children": []
                },
                {
                  "id": "9b1dbd12-5c25-4342-8a5d-846b7f85bc06",
                  "slug": "lincoln",
                  "icon": null,
                  "image": null,
                  "sort_order": 61,
                  "level": 2,
                  "name": "لينكولن",
                  "description": "مركبات لينكولن",
                  "children": []
                },
                {
                  "id": "06806546-a20a-42ea-b95e-5eae6dc6b16f",
                  "slug": "ling-box",
                  "icon": null,
                  "image": null,
                  "sort_order": 62,
                  "level": 2,
                  "name": "لينج بوكس",
                  "description": "مركبات لينج بوكس",
                  "children": []
                },
                {
                  "id": "21917a22-4c15-4a04-873d-6741161cbf55",
                  "slug": "mahindra",
                  "icon": null,
                  "image": null,
                  "sort_order": 63,
                  "level": 2,
                  "name": "ماهيندرا",
                  "description": "مركبات ماهيندرا",
                  "children": []
                },
                {
                  "id": "0e8125dc-365d-4f98-a008-f16870c8f58f",
                  "slug": "maruti-suzuki",
                  "icon": null,
                  "image": null,
                  "sort_order": 64,
                  "level": 2,
                  "name": "ماروتي سوزوكي",
                  "description": "مركبات ماروتي سوزوكي",
                  "children": []
                },
                {
                  "id": "17f3d04d-802c-4111-bb81-d077c16a72d9",
                  "slug": "maserati",
                  "icon": null,
                  "image": null,
                  "sort_order": 65,
                  "level": 2,
                  "name": "مازيراتي",
                  "description": "مركبات مازيراتي",
                  "children": []
                },
                {
                  "id": "9b4a2271-22f1-4924-907f-41fcd867155f",
                  "slug": "maxus",
                  "icon": null,
                  "image": null,
                  "sort_order": 66,
                  "level": 2,
                  "name": "ماكسيوس",
                  "description": "مركبات ماكسيوس",
                  "children": []
                },
                {
                  "id": "9f8cee06-3742-48b5-a4a7-3dc988b5a45a",
                  "slug": "mclaren",
                  "icon": null,
                  "image": null,
                  "sort_order": 68,
                  "level": 2,
                  "name": "مكلارين",
                  "description": "مركبات مكلارين",
                  "children": []
                },
                {
                  "id": "9b1d376b-b69d-45a1-8520-2bc411b09fae",
                  "slug": "mercury",
                  "icon": null,
                  "image": null,
                  "sort_order": 70,
                  "level": 2,
                  "name": "ميركوري",
                  "description": "مركبات ميركوري",
                  "children": []
                },
                {
                  "id": "c9bca6d8-ebd5-4e30-9536-822b26d66fb9",
                  "slug": "mg",
                  "icon": null,
                  "image": null,
                  "sort_order": 71,
                  "level": 2,
                  "name": "ام جي",
                  "description": "مركبات ام جي",
                  "children": []
                },
                {
                  "id": "d96cb646-1c87-4269-bf35-d092eef273e5",
                  "slug": "mini",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641970980-a596e2db-a8e6-487b-9d32-67756bcf4207.webp",
                  "image": null,
                  "sort_order": 72,
                  "level": 2,
                  "name": "ميني",
                  "description": "مركبات ميني",
                  "children": []
                },
                {
                  "id": "5532e701-a36a-42b8-9c00-1815bb525268",
                  "slug": "mitsubishi",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641948663-81a57540-d9eb-4818-b0d6-b0a984ec3047.webp",
                  "image": null,
                  "sort_order": 73,
                  "level": 2,
                  "name": "ميتسوبيشي",
                  "description": "مركبات ميتسوبيشي",
                  "children": []
                },
                {
                  "id": "bbe9c161-d59a-4054-a404-8e4f5a4221ab",
                  "slug": "neta",
                  "icon": null,
                  "image": null,
                  "sort_order": 74,
                  "level": 2,
                  "name": "نيتا",
                  "description": "مركبات نيتا",
                  "children": []
                },
                {
                  "id": "051d02e9-a2d1-4147-b7fd-adf8da0035d2",
                  "slug": "opel",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641898073-1b10767f-8dec-4b4c-a78d-f943de0cc67b.webp",
                  "image": null,
                  "sort_order": 76,
                  "level": 2,
                  "name": "أوبل",
                  "description": "مركبات أوبل",
                  "children": []
                },
                {
                  "id": "ebe71598-6487-452d-9786-eb6b614fa06c",
                  "slug": "pagani",
                  "icon": null,
                  "image": null,
                  "sort_order": 77,
                  "level": 2,
                  "name": "باجاني",
                  "description": "مركبات باجاني",
                  "children": []
                },
                {
                  "id": "2b140a3a-e464-4dff-a393-3e140748a569",
                  "slug": "peugeot",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641867784-9fc8dfe7-5191-4951-a1a5-2abe2e81f3ea.webp",
                  "image": null,
                  "sort_order": 78,
                  "level": 2,
                  "name": "بيجو",
                  "description": "مركبات بيجو",
                  "children": []
                },
                {
                  "id": "ed2df2fb-b9e0-43d9-9df0-55a50012a88b",
                  "slug": "polestar",
                  "icon": null,
                  "image": null,
                  "sort_order": 79,
                  "level": 2,
                  "name": "بولستار",
                  "description": "مركبات بولستار",
                  "children": []
                },
                {
                  "id": "f4235190-3c43-4393-81ea-6a342742fec3",
                  "slug": "pontiac",
                  "icon": null,
                  "image": null,
                  "sort_order": 80,
                  "level": 2,
                  "name": "بونتياك",
                  "description": "مركبات بونتياك",
                  "children": []
                },
                {
                  "id": "95b4c08b-bc80-42b7-b4f9-03f595f945f4",
                  "slug": "porsche",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641847052-5f68ae07-b718-4789-8e1d-95eb8f32d542.webp",
                  "image": null,
                  "sort_order": 81,
                  "level": 2,
                  "name": "بورش",
                  "description": "مركبات بورش",
                  "children": []
                },
                {
                  "id": "8524dbc7-c606-412f-a785-69420f2ba3c7",
                  "slug": "proton",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641823952-eb812a64-0eaa-4c97-8210-974f6d7be7fe.webp",
                  "image": null,
                  "sort_order": 82,
                  "level": 2,
                  "name": "بروتون",
                  "description": "مركبات بروتون",
                  "children": []
                },
                {
                  "id": "c66565f1-5c97-457f-bc1e-9f4dba380c12",
                  "slug": "rabdan",
                  "icon": null,
                  "image": null,
                  "sort_order": 83,
                  "level": 2,
                  "name": "ربدان",
                  "description": "مركبات ربدان",
                  "children": []
                },
                {
                  "id": "332c70ba-2d83-4a5d-a732-5123add718d2",
                  "slug": "renault",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641799497-41e95460-afb8-4972-aed2-818daa3fea26.webp",
                  "image": null,
                  "sort_order": 84,
                  "level": 2,
                  "name": "رينو",
                  "description": "مركبات رينو",
                  "children": []
                },
                {
                  "id": "f5b604b2-7287-4d80-ad75-01fcb18e2596",
                  "slug": "rolls-royce",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641730384-4519a6ca-003d-4121-ba47-8e7bbe8d6f1d.webp",
                  "image": null,
                  "sort_order": 85,
                  "level": 2,
                  "name": "رولز رویس",
                  "description": "مركبات رولز رویس",
                  "children": []
                },
                {
                  "id": "6995ba67-09f3-4bc7-b1ca-ffb9ffd56566",
                  "slug": "rox",
                  "icon": null,
                  "image": null,
                  "sort_order": 86,
                  "level": 2,
                  "name": "روكس",
                  "description": "مركبات روكس",
                  "children": []
                },
                {
                  "id": "05cce69a-adde-4202-b92b-50e7f40b7dc8",
                  "slug": "saab",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641766094-f159c7ed-c79a-446e-aff8-72b0df2129c9.webp",
                  "image": null,
                  "sort_order": 87,
                  "level": 2,
                  "name": "ساب",
                  "description": "مركبات ساب",
                  "children": []
                },
                {
                  "id": "36cdd93a-1a20-4311-aca5-b8256f644457",
                  "slug": "saipa",
                  "icon": null,
                  "image": null,
                  "sort_order": 88,
                  "level": 2,
                  "name": "سايبا",
                  "description": "مركبات سايبا",
                  "children": []
                },
                {
                  "id": "7c137b63-5f58-4298-963a-a2c6fe2b758b",
                  "slug": "samsung",
                  "icon": null,
                  "image": null,
                  "sort_order": 89,
                  "level": 2,
                  "name": "سامسونج",
                  "description": "مركبات سامسونج",
                  "children": []
                },
                {
                  "id": "5fab9d96-0904-4dcb-a660-c48f514248d7",
                  "slug": "saturn",
                  "icon": null,
                  "image": null,
                  "sort_order": 90,
                  "level": 2,
                  "name": "ساتورن",
                  "description": "مركبات ساتورن",
                  "children": []
                },
                {
                  "id": "c0eae600-288e-4c10-ac1a-81ebb336b13c",
                  "slug": "scion",
                  "icon": null,
                  "image": null,
                  "sort_order": 91,
                  "level": 2,
                  "name": "سيون",
                  "description": "مركبات سيون",
                  "children": []
                },
                {
                  "id": "726cc717-e3af-4891-a858-843b7a5efbe0",
                  "slug": "seat",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641706733-6a0ac191-73c9-42b8-9909-55558f3892d6.webp",
                  "image": null,
                  "sort_order": 92,
                  "level": 2,
                  "name": "سيات",
                  "description": "مركبات سيات",
                  "children": []
                },
                {
                  "id": "6cd6418c-8c2c-46bc-a37e-04bf5e62c373",
                  "slug": "skywell",
                  "icon": null,
                  "image": null,
                  "sort_order": 94,
                  "level": 2,
                  "name": "سكاي ويل",
                  "description": "مركبات سكاي ويل",
                  "children": []
                },
                {
                  "id": "933af1ef-c0b2-4c38-8919-412556bf881f",
                  "slug": "smart-1",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641675022-df0779d4-25a6-4309-b00b-29f28b3a9db6.webp",
                  "image": null,
                  "sort_order": 95,
                  "level": 2,
                  "name": "سمارت",
                  "description": "مركبات سمارت",
                  "children": []
                },
                {
                  "id": "fdda83c1-2105-4da9-8f2c-b356687af30d",
                  "slug": "soueast",
                  "icon": null,
                  "image": null,
                  "sort_order": 96,
                  "level": 2,
                  "name": "ساوايست ‬ ‫",
                  "description": "مركبات ساوايست ‬ ‫",
                  "children": []
                },
                {
                  "id": "1d295df0-8e4b-43ce-b34d-fa7748377fba",
                  "slug": "spyker",
                  "icon": null,
                  "image": null,
                  "sort_order": 97,
                  "level": 2,
                  "name": "سبايكر",
                  "description": "مركبات سبايكر",
                  "children": []
                },
                {
                  "id": "0f3c27dc-3ead-4e4b-a9a9-56bcb2f8056f",
                  "slug": "ssangyong",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641622218-38000af4-8d73-4963-baf2-752b61a3e139.webp",
                  "image": null,
                  "sort_order": 98,
                  "level": 2,
                  "name": "سانغ يونغ",
                  "description": "مركبات سانغ يونغ",
                  "children": []
                },
                {
                  "id": "e6b173ce-22ea-409e-b429-e605ada1f807",
                  "slug": "subaru",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641597066-0eaa5db5-88bf-46c1-b831-2369181962fa.webp",
                  "image": null,
                  "sort_order": 99,
                  "level": 2,
                  "name": "سوبارو",
                  "description": "مركبات سوبارو",
                  "children": []
                },
                {
                  "id": "5709bd1c-fab4-42a1-baf9-4fc7a7048dc6",
                  "slug": "suzuki",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641527559-600a1dde-9c05-4c62-9b6e-3e3e2a703025.webp",
                  "image": null,
                  "sort_order": 100,
                  "level": 2,
                  "name": "سوزوكي",
                  "description": "مركبات سوزوكي",
                  "children": []
                },
                {
                  "id": "d8b0facb-90d8-42f7-96aa-b8d75b5a2c05",
                  "slug": "tank",
                  "icon": null,
                  "image": null,
                  "sort_order": 101,
                  "level": 2,
                  "name": "تانك",
                  "description": "مركبات تانك",
                  "children": []
                },
                {
                  "id": "a860ee4f-68d6-4791-b672-13acb4e44445",
                  "slug": "tata",
                  "icon": null,
                  "image": null,
                  "sort_order": 102,
                  "level": 2,
                  "name": "تاتا",
                  "description": "مركبات تاتا",
                  "children": []
                },
                {
                  "id": "79d84bee-61cd-44c3-ace9-21e153db362a",
                  "slug": "tesla",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641561336-6a2d5a27-11ee-4ece-a07a-807e2ad1cdf7.webp",
                  "image": null,
                  "sort_order": 103,
                  "level": 2,
                  "name": "تيسلا",
                  "description": "مركبات تيسلا",
                  "children": []
                },
                {
                  "id": "28616794-3409-420d-adf2-75e68dc5e66c",
                  "slug": "vgv",
                  "icon": null,
                  "image": null,
                  "sort_order": 105,
                  "level": 2,
                  "name": "في جي في",
                  "description": "مركبات في جي في",
                  "children": []
                },
                {
                  "id": "d983e866-e448-4415-997b-dd2450e31640",
                  "slug": "volkswagen",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752641411916-abe30b83-6ed4-420a-8868-3edf4fdae50b.webp",
                  "image": null,
                  "sort_order": 106,
                  "level": 2,
                  "name": "فولكسفاغن",
                  "description": "مركبات فولكسفاغن",
                  "children": []
                },
                {
                  "id": "eee95db2-dcf2-4f00-8073-0b8832412448",
                  "slug": "weltmeister",
                  "icon": null,
                  "image": null,
                  "sort_order": 108,
                  "level": 2,
                  "name": "ويلتميستر",
                  "description": "مركبات ويلتميستر",
                  "children": []
                },
                {
                  "id": "af7d9b1c-a416-479a-89b3-ea0a024f3d77",
                  "slug": "wuling",
                  "icon": null,
                  "image": null,
                  "sort_order": 109,
                  "level": 2,
                  "name": "وولينغ",
                  "description": "مركبات وولينغ",
                  "children": []
                },
                {
                  "id": "679a726e-2d93-4cd5-956a-30361ec5091b",
                  "slug": "yudo",
                  "icon": null,
                  "image": null,
                  "sort_order": 110,
                  "level": 2,
                  "name": "يودو",
                  "description": "مركبات يودو",
                  "children": []
                },
                {
                  "id": "dd75755e-1d6f-42ae-b802-b2908f89508c",
                  "slug": "zeekr",
                  "icon": null,
                  "image": null,
                  "sort_order": 111,
                  "level": 2,
                  "name": "زيكر",
                  "description": "مركبات زيكر",
                  "children": []
                },
                {
                  "id": "18dcb2fc-0b1f-4c53-a8cf-35f76e58693c",
                  "slug": "zotye",
                  "icon": null,
                  "image": null,
                  "sort_order": 112,
                  "level": 2,
                  "name": "زوتي",
                  "description": "مركبات زوتي",
                  "children": []
                },
                {
                  "id": "3822f6f4-542c-494c-afc1-3fc5a95d3e39",
                  "slug": "zx-auto",
                  "icon": null,
                  "image": null,
                  "sort_order": 113,
                  "level": 2,
                  "name": "زد إكس اوتو",
                  "description": "مركبات زد إكس اوتو",
                  "children": []
                },
                {
                  "id": "07cdf1a4-4f3f-4745-92d4-ba2b308e2b6b",
                  "slug": "acura",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752581135720-b66de37b-fac6-4025-a45b-c967c4fd4d0c.webp",
                  "image": null,
                  "sort_order": 114,
                  "level": 2,
                  "name": "اكيورا",
                  "description": "مركبات اكيورا",
                  "children": []
                },
                {
                  "id": "3e905dca-483e-4dd3-9ec3-78c9dd1236fe",
                  "slug": "alfa-romeo",
                  "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752642489683-475dc0c8-754b-45c4-9f4e-6e7f9fa9042b.webp",
                  "image": null,
                  "sort_order": 115,
                  "level": 2,
                  "name": "الفا روميو",
                  "description": "مركبات الفا روميو",
                  "children": []
                }
              ]
            },
            {
              "id": "00000000-0000-0000-0002-000000000005",
              "slug": "trucks",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734691110-42e727dd-8e57-4726-aa4a-d05ebc321637.webp",
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "الشاحنات",
              "description": "شاحنات ثقيلة، بيك آب، ومركبات نقل للبيع في سوريا.",
              "children": []
            },
            {
              "id": "00000000-0000-0000-0002-000000000007",
              "slug": "boats",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734801478-5df7b898-a572-46eb-85b4-d5250f7b7c8e.webp",
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "القوارب",
              "description": "قوارب صغيرة، قوارب صيد، وزوارق شخصية للبيع في سوريا.",
              "children": []
            },
            {
              "id": "00000000-0000-0000-0002-000000000008",
              "slug": "equipment",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734754356-99f288a5-af83-46e1-9759-7f7d1054b3d6.webp",
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "المعدات",
              "description": "معدات البناء، الآلات الزراعية، والأدوات الثقيلة للبيع.",
              "children": []
            },
            {
              "id": "00000000-0000-0000-0002-000000000006",
              "slug": "buses",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734853139-81156d11-5e9d-446e-a360-6fc99424785e.webp",
              "image": null,
              "sort_order": 7,
              "level": 0,
              "name": "الباصات",
              "description": "باصات جديدة ومستعملة للبيع في سوريا، بما فيها الباصات الصغيرة والكبيرة.",
              "children": []
            },
            {
              "id": "00000000-0000-0000-0002-000000000009",
              "slug": "spare-parts",
              "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734947656-1ea970ce-3fa9-414d-8c12-2575e9969d18.webp",
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "قطع الغيار",
              "description": "قطع سيارات، قطع دراجات نارية، وقطع شاحنات للبيع.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000018",
          "slug": "services",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1753018386848-6e4c36f5-b5c3-4708-b47d-c7c37dab2b36.webp",
          "image": null,
          "sort_order": 3,
          "level": 0,
          "name": "خدمة",
          "description": "اعثر على مجموعة واسعة من الخدمات المهنية لتلبية احتياجاتك. من إصلاحات المنزل والصيانة إلى الخدمات التجارية والقانونية، تواصل مع المهنيين المهرة في سوريا.",
          "children": [
            {
              "id": "45cfbe85-498c-4466-a5b2-a63824e8f5b8",
              "slug": "business-services",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "خدمات الأعمال",
              "description": "خدمات متخصصة لدعم الشركات والأعمال.",
              "children": [
                {
                  "id": "8b45ec65-2f88-4d2a-85e3-187b6c5c8fa7",
                  "slug": "digital-marketing-social-media",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "التسويق الرقمي والسوشيال ميديا",
                  "description": "خدمات التسويق الرقمي الشاملة تشمل إدارة السوشيال ميديا، تحسين محركات البحث، الإعلانات المدفوعة، وصناعة المحتوى.",
                  "children": []
                },
                {
                  "id": "1a79f44c-00f8-4018-9e2d-ffba0e2f6303",
                  "slug": "business-consulting-strategy",
                  "icon": null,
                  "image": null,
                  "sort_order": 7,
                  "level": 2,
                  "name": "الاستشارات والاستراتيجية",
                  "description": "خدمات الاستشارات التجارية المهنية تشمل التخطيط الاستراتيجي، أبحاث السوق، الاستشارات المالية، وتطوير الأعمال.",
                  "children": []
                },
                {
                  "id": "d8cb7ec0-6e1d-4bc2-a48c-4735247a9ce4",
                  "slug": "legal-professional-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 9,
                  "level": 2,
                  "name": "الخدمات القانونية والمهنية",
                  "description": "الخدمات القانونية والمهنية تشمل الاستشارات القانونية، التوثيق، المحاسبة، الخدمات الضريبية، والدعم الإداري.",
                  "children": []
                },
                {
                  "id": "a2f10a30-7a3c-4958-aa69-2ce321eb8f54",
                  "slug": "ecommerce-online-business",
                  "icon": null,
                  "image": null,
                  "sort_order": 11,
                  "level": 2,
                  "name": "التجارة الإلكترونية والأعمال الرقمية",
                  "description": "خدمات التجارة الإلكترونية والأعمال الرقمية تشمل إعداد المتاجر، إدارة المنتجات، تكامل الدفع، والتسويق الإلكتروني.",
                  "children": []
                },
                {
                  "id": "0d913ad2-26b6-4649-a0a4-0c3418f6a121",
                  "slug": "financial-services-consulting",
                  "icon": null,
                  "image": null,
                  "sort_order": 19,
                  "level": 2,
                  "name": "الخدمات المالية والاستشارات",
                  "description": "الخدمات المالية والاستشارات تشمل التخطيط المالي، استشارات الاستثمار، الميزانية، إعداد الضرائب، والتحليل المالي.",
                  "children": []
                },
                {
                  "id": "397e5d9e-f291-403a-88ed-680d4709bda0",
                  "slug": "human-resources-recruitment",
                  "icon": null,
                  "image": null,
                  "sort_order": 22,
                  "level": 2,
                  "name": "الموارد البشرية والتوظيف",
                  "description": "خدمات الموارد البشرية والتوظيف تشمل استقطاب المواهب، تدريب الموظفين، استشارات الموارد البشرية، إدارة الأداء، وتعهيد عمليات التوظيف.",
                  "children": []
                },
                {
                  "id": "2f26cb37-c977-411d-b5fb-2dc5bbc2407b",
                  "slug": "insurance-risk-management",
                  "icon": null,
                  "image": null,
                  "sort_order": 28,
                  "level": 2,
                  "name": "التأمين وإدارة المخاطر",
                  "description": "خدمات التأمين وإدارة المخاطر تشمل استشارات التأمين، تقييم المخاطر، معالجة المطالبات، ووساطة التأمين.",
                  "children": []
                },
                {
                  "id": "75900596-da5b-4530-85bc-bc0f37de8ffa",
                  "slug": "import-export-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 33,
                  "level": 2,
                  "name": "خدمات الاستيراد والتصدير",
                  "description": "خدمات الاستيراد والتصدير تشمل استشارات التجارة، التخليص الجمركي، الشحن الدولي، التوثيق، وتمويل التجارة.",
                  "children": []
                }
              ]
            },
            {
              "id": "e5c9764c-fc87-4576-9ff1-14afdb3de10a",
              "slug": "creative-services",
              "icon": null,
              "image": null,
              "sort_order": 20,
              "level": 1,
              "name": "خدمات إبداعية",
              "description": "خدمات تركز على التصميم، المحتوى، والإنتاج الفني.",
              "children": [
                {
                  "id": "ad17f4a2-6166-4427-a306-8e2c49d80e2a",
                  "slug": "graphic-design-visual-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "التصميم الجرافيكي والخدمات البصرية",
                  "description": "خدمات التصميم الجرافيكي المهنية تشمل تصميم الشعارات، العلامة التجارية، التصميم المطبوع، تصميم المواقع، والهوية البصرية.",
                  "children": []
                },
                {
                  "id": "11b4b0d3-39e7-42bd-8573-f86a10af3f8b",
                  "slug": "video-production-editing",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "إنتاج ومونتاج الفيديو",
                  "description": "خدمات إنتاج الفيديو الشاملة تشمل التصوير، المونتاج، الموشن جرافيك، الأنيميشن، والمونتاج النهائي.",
                  "children": []
                },
                {
                  "id": "86f53147-7e88-4225-ba5a-6274dc0f55bc",
                  "slug": "writing-translation-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 5,
                  "level": 2,
                  "name": "الكتابة والترجمة",
                  "description": "خدمات الكتابة والترجمة المهنية تشمل كتابة المحتوى، الكتابة الإعلانية، الترجمة، التدقيق اللغوي، والتوطين.",
                  "children": []
                },
                {
                  "id": "8bca96ba-2176-4536-870a-984132ae2f32",
                  "slug": "audio-voice-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 6,
                  "level": 2,
                  "name": "الخدمات الصوتية والتعليق",
                  "description": "الخدمات الصوتية المهنية تشمل التعليق الصوتي، إنتاج الموسيقى، تصميم الصوت، تحرير الصوت، وإنتاج البودكاست.",
                  "children": []
                },
                {
                  "id": "ac003527-44e5-4823-9138-5ea067315408",
                  "slug": "photography-image-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 12,
                  "level": 2,
                  "name": "التصوير وخدمات الصور",
                  "description": "خدمات التصوير والصور المهنية تشمل تصوير المنتجات، التصوير الشخصي، تحرير الصور، وتنقيح الصور.",
                  "children": []
                },
                {
                  "id": "644a28c7-5361-42cc-924f-556ab9ca56db",
                  "slug": "interior-design-decoration",
                  "icon": null,
                  "image": null,
                  "sort_order": 21,
                  "level": 2,
                  "name": "التصميم الداخلي والديكور",
                  "description": "خدمات التصميم الداخلي والديكور تشمل تخطيط المساحات، اختيار الأثاث، استشارات الألوان، وتنسيق المنازل.",
                  "children": []
                }
              ]
            },
            {
              "id": "d3892479-7d67-41b5-b62a-88508656a79d",
              "slug": "technical-services",
              "icon": null,
              "image": null,
              "sort_order": 30,
              "level": 1,
              "name": "خدمات تقنية",
              "description": "خدمات متخصصة في التكنولوجيا، البرمجة، والدعم الفني.",
              "children": [
                {
                  "id": "d0d7aa35-2af4-4281-940b-78f05283feb9",
                  "slug": "web-development-programming",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "تطوير المواقع والبرمجة",
                  "description": "خدمات تطوير المواقع الشاملة تشمل إنشاء المواقع، تطبيقات الجوال، التجارة الإلكترونية، البرمجيات المخصصة، وتكامل الأنظمة.",
                  "children": []
                },
                {
                  "id": "e8435057-2c5f-4315-8ea9-c44693feca03",
                  "slug": "data-analytics-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "خدمات البيانات والتحليل",
                  "description": "خدمات البيانات والتحليل المهنية تشمل تحليل البيانات، ذكاء الأعمال، أبحاث السوق، والتقارير الإحصائية.",
                  "children": []
                },
                {
                  "id": "f3d93611-60f7-490c-be91-009439ca748a",
                  "slug": "technology-it-support",
                  "icon": null,
                  "image": null,
                  "sort_order": 15,
                  "level": 2,
                  "name": "التكنولوجيا ودعم تقنية المعلومات",
                  "description": "خدمات التكنولوجيا ودعم تقنية المعلومات تشمل الدعم التقني، تثبيت البرمجيات، إعداد الشبكات، والأمن السيبراني.",
                  "children": []
                }
              ]
            },
            {
              "id": "9df73936-067b-4644-b446-f2a1c5736ca2",
              "slug": "training-education-services",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "التدريب والتعليم",
              "description": "خدمات التدريب والتعليم المهنية تشمل الدورات الإلكترونية، ورش العمل، التدريب، تطوير المهارات، وبرامج الشهادات.",
              "children": []
            },
            {
              "id": "73a7bbf7-6b75-415e-a3a4-a3bbdb37379e",
              "slug": "virtual-assistant-administrative",
              "icon": null,
              "image": null,
              "sort_order": 13,
              "level": 1,
              "name": "المساعد الافتراضي والخدمات الإدارية",
              "description": "خدمات المساعد الافتراضي والإدارية تشمل إدخال البيانات، دعم العملاء، جدولة المواعيد، والمهام الإدارية.",
              "children": []
            },
            {
              "id": "d632928a-fc30-439c-a7a0-d1e1d733cee2",
              "slug": "research-content-creation",
              "icon": null,
              "image": null,
              "sort_order": 14,
              "level": 1,
              "name": "البحث وإنشاء المحتوى",
              "description": "خدمات البحث وإنشاء المحتوى تشمل أبحاث السوق، البحث الأكاديمي، استراتيجية المحتوى، والكتابة الإبداعية.",
              "children": []
            },
            {
              "id": "d6f51e85-e623-4738-8386-32bc6e8203cd",
              "slug": "event-planning-management",
              "icon": null,
              "image": null,
              "sort_order": 16,
              "level": 1,
              "name": "تخطيط وإدارة الفعاليات",
              "description": "خدمات تخطيط وإدارة الفعاليات الشاملة تشمل حفلات الزفاف، الفعاليات المؤسسية، المؤتمرات، المعارض، وتخطيط الحفلات.",
              "children": []
            },
            {
              "id": "c72cd80d-df6e-4fb0-9bd9-b3da6cbca7d5",
              "slug": "healthcare-medical-services",
              "icon": null,
              "image": null,
              "sort_order": 17,
              "level": 1,
              "name": "الرعاية الصحية والخدمات الطبية",
              "description": "خدمات الرعاية الصحية والطبية تشمل الطب عن بُعد، الاستشارات الطبية، التدريب الصحي، الكتابة الطبية، وإدارة الرعاية الصحية.",
              "children": []
            },
            {
              "id": "5480245a-1ea9-4983-bab0-ad681c5609f8",
              "slug": "real-estate-services",
              "icon": null,
              "image": null,
              "sort_order": 18,
              "level": 1,
              "name": "خدمات العقارات",
              "description": "خدمات العقارات الشاملة تشمل تقييم العقارات، الاستشارات العقارية، إدارة العقارات، والتسويق العقاري.",
              "children": []
            },
            {
              "id": "a649ef5a-7ba5-42f6-a7b2-25b23c38d94f",
              "slug": "architecture-engineering-services",
              "icon": null,
              "image": null,
              "sort_order": 20,
              "level": 1,
              "name": "خدمات الهندسة المعمارية والهندسة",
              "description": "خدمات الهندسة المعمارية والهندسة تشمل التصميم المعماري، الهندسة الإنشائية، إدارة المشاريع، والاستشارات الإنشائية.",
              "children": []
            },
            {
              "id": "3cbdc34e-0490-4378-9615-fee263fc6356",
              "slug": "logistics-transportation-services",
              "icon": null,
              "image": null,
              "sort_order": 23,
              "level": 1,
              "name": "خدمات اللوجستيات والنقل",
              "description": "خدمات اللوجستيات والنقل تشمل إدارة سلسلة التوريد، وكالة الشحن، إدارة المستودعات، وخدمات التوصيل.",
              "children": []
            },
            {
              "id": "b3218521-433c-4e50-ad20-c79b77d2db35",
              "slug": "food-catering-services",
              "icon": null,
              "image": null,
              "sort_order": 24,
              "level": 1,
              "name": "خدمات الطعام والضيافة",
              "description": "خدمات الطعام والضيافة تشمل خدمات الضيافة للفعاليات، تخطيط الوجبات، توصيل الطعام، استشارات المطاعم، والخدمات الطهوية.",
              "children": []
            },
            {
              "id": "8ed653c8-9cda-4c6e-acb0-08019143db38",
              "slug": "beauty-personal-care-services",
              "icon": null,
              "image": null,
              "sort_order": 25,
              "level": 1,
              "name": "خدمات التجميل والعناية الشخصية",
              "description": "خدمات التجميل والعناية الشخصية تشمل فن المكياج، استشارات العناية بالبشرة، التدريب على التجميل، والتنسيق الشخصي.",
              "children": []
            },
            {
              "id": "b264dc8f-8a13-46d7-b147-921eccd01bc4",
              "slug": "sports-fitness-services",
              "icon": null,
              "image": null,
              "sort_order": 26,
              "level": 1,
              "name": "خدمات الرياضة واللياقة البدنية",
              "description": "خدمات الرياضة واللياقة البدنية تشمل التدريب الشخصي، تدريب اللياقة، التدريب الرياضي، تخطيط التغذية، وبرامج العافية.",
              "children": []
            },
            {
              "id": "ab89faed-02b9-4629-b3a1-686d75062837",
              "slug": "travel-tourism-services",
              "icon": null,
              "image": null,
              "sort_order": 27,
              "level": 1,
              "name": "خدمات السفر والسياحة",
              "description": "خدمات السفر والسياحة تشمل تخطيط السفر، الإرشاد السياحي، استشارات السياحة، الكتابة السياحية، والتسويق السياحي.",
              "children": []
            },
            {
              "id": "fcbc4fee-0df1-4512-8b73-6bdeca474ea0",
              "slug": "maintenance-repair-services",
              "icon": null,
              "image": null,
              "sort_order": 29,
              "level": 1,
              "name": "خدمات الصيانة والإصلاح",
              "description": "خدمات الصيانة والإصلاح تشمل صيانة المنازل، إصلاح الأجهزة، خدمات التكييف، السباكة، الأعمال الكهربائية، والإصلاحات العامة.",
              "children": []
            },
            {
              "id": "082dd66c-23bb-4108-b540-c4f162689e29",
              "slug": "security-services",
              "icon": null,
              "image": null,
              "sort_order": 30,
              "level": 1,
              "name": "خدمات الأمن",
              "description": "خدمات الأمن تشمل استشارات الأمن السيبراني، الأمن المادي، تقييم الأمن، أنظمة المراقبة، والتدريب الأمني.",
              "children": []
            },
            {
              "id": "df871479-8b8f-467d-b10b-adc72f1bf7f2",
              "slug": "environmental-services",
              "icon": null,
              "image": null,
              "sort_order": 31,
              "level": 1,
              "name": "الخدمات البيئية",
              "description": "الخدمات البيئية تشمل الاستشارات البيئية، تخطيط الاستدامة، إدارة النفايات، تدقيق الطاقة، والامتثال البيئي.",
              "children": []
            },
            {
              "id": "b2271ffc-e19b-46d0-a5f8-e020c71754b8",
              "slug": "manufacturing-production-services",
              "icon": null,
              "image": null,
              "sort_order": 32,
              "level": 1,
              "name": "خدمات التصنيع والإنتاج",
              "description": "خدمات التصنيع والإنتاج تشمل تصميم المنتجات، تطوير النماذج الأولية، استشارات التصنيع، مراقبة الجودة، وإدارة الإنتاج.",
              "children": []
            },
            {
              "id": "fed8e767-e391-43da-94f4-48773a749acb",
              "slug": "automotive-services",
              "icon": null,
              "image": null,
              "sort_order": 34,
              "level": 1,
              "name": "خدمات السيارات",
              "description": "خدمات السيارات تشمل صيانة السيارات، إصلاح السيارات، فحص المركبات، استشارات السيارات، وإدارة الأساطيل.",
              "children": []
            },
            {
              "id": "e9a4a29f-83f7-4ba9-9736-0cf60bc6e497",
              "slug": "telecommunications-services",
              "icon": null,
              "image": null,
              "sort_order": 35,
              "level": 1,
              "name": "خدمات الاتصالات",
              "description": "خدمات الاتصالات تشمل إعداد الشبكات، استشارات الاتصالات، خدمات VoIP، أنظمة الاتصالات، وصيانة الاتصالات.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000004",
          "slug": "furniture-home-decor",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752735127104-723491a7-4dcf-45bf-a24b-4ff25c69e0c3.webp",
          "image": null,
          "sort_order": 4,
          "level": 0,
          "name": "أثاث وديكور المنزل",
          "description": "أثث وزين منزلك بمجموعة متنوعة من الأثاث وديكور المنزل الجديد والمستعمل. اعثر على كنبات، أسرة، طاولات، كراسي، وقطع ديكور تناسب ذوقك.",
          "children": [
            {
              "id": "89e0b71d-5a9a-45ea-a4e9-181890bfe14a",
              "slug": "living-room-furniture",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "أثاث غرفة القعدة",
              "description": "اكتشف تشكيلة متكاملة من أثاث غرفة القعدة، تتضمن كنبايات عصرية، طاولات وسط، مكتبات تلفزيون، كراسي استرخاء، ومراكز ترفيه وقطع ديكور مميزة.",
              "children": [
                {
                  "id": "24f22e2d-62e9-4e05-bd0c-baa9826ccb26",
                  "slug": "coffee-side-tables",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "طاولات وسط وجانبية",
                  "description": "مجموعة واسعة من طاولات الوسط، الطاولات الجانبية، الطاولات المتداخلة (عش العصفور)، وطاولات الكونسول بمواد متنوعة مثل الخشب، الزجاج، الرخام، والمعدن.",
                  "children": []
                },
                {
                  "id": "f5d9b2e6-73b7-4f6f-bea7-60c44e1b7e96",
                  "slug": "sofas-couches",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "كنبايات ومقاعد",
                  "description": "تصفح جميع أنواع الكنبايات والمقاعد: أطقم زاوية (L-shape)، أطقم كنبايات (3+2+1)، مقطعة، كنبايات ثنائية (loveseats)، كنبايات سرير مريحة، وحلول جلوس عصرية.",
                  "children": []
                },
                {
                  "id": "82313598-3714-460a-b8ac-6ccf3fe9394e",
                  "slug": "tv-units-entertainment-centers",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "مكتبات تلفزيون ومراكز ترفيه",
                  "description": "اعثر على مكتبة التلفزيون المثالية، سواء كانت طاولة، وحدة مثبتة على الحائط، أو مركز ترفيه متكامل لتنظيم أجهزتك الإعلامية بأناقة.",
                  "children": []
                },
                {
                  "id": "83d6bb70-2bf5-40b5-a648-95507aa34557",
                  "slug": "recliners-accent-chairs",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "كراسي استرخاء وفوتويلات",
                  "description": "استرخِ بأناقة مع كراسي الاسترخاء (recliners) المريحة، الفوتويلات الأنيقة، الكراسي الكلاسيكية (fauteuils)، وكراسي بمساند رأس، وغيرها من خيارات الجلوس المميزة.",
                  "children": []
                }
              ]
            },
            {
              "id": "5859831c-8808-4130-9494-95ae5b78cfe9",
              "slug": "bedroom-furniture",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "أثاث غرف النوم",
              "description": "تسوق أطقم ومفروشات غرف نوم كاملة، تشمل تخوت مودرن، خزائن ملابس واسعة، تسريحات، كومودينات، فرشات نوم عالية الجودة، وإكسسوارات مميزة لغرفة النوم.",
              "children": [
                {
                  "id": "6e6c44f1-7e1a-4954-8c1b-1bc00718cfc0",
                  "slug": "beds-bed-frames",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "تخوت وقواعد تخوت",
                  "description": "جميع أنواع التخوت وقواعدها: مفرد، مجوز، قياس كوين وكينغ، تخوت بقاعدة منخفضة (platform)، تخوت منجدة، وتخوت مع صناديق تخزين مدمجة.",
                  "children": []
                },
                {
                  "id": "a97a97c3-d643-4a91-88c2-54184b50349c",
                  "slug": "wardrobes-closets",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "خزائن الملابس",
                  "description": "اعثر على خزائن ملابس واسعة، أنظمة غرف خزائن (walk-in)، خزائن بأبواب سحابة، خزائن بأبواب جرارة، وحلول خزائن معيارية تناسب أي مساحة.",
                  "children": []
                },
                {
                  "id": "c9574bef-8dca-48f6-9905-92d23329817b",
                  "slug": "dressers-chests",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "تسريحات وخزائن جوارير",
                  "description": "تسريحات أنيقة مع مرايا (كوافير)، خزائن جوارير ( cómoda)، طاولات زينة، وقطع أثاث تخزين أخرى لغرفة النوم للحفاظ على مساحتك منظمة.",
                  "children": []
                },
                {
                  "id": "64a1b43b-d234-4f03-9b6c-42fb78668e77",
                  "slug": "nightstands-bedside-tables",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "كومودينات",
                  "description": "كومودينات عملية وأنيقة، طاولات جانبية للتخت، وخزائن صغيرة بجوارير أو رفوف بتصاميم عصرية وكلاسيكية.",
                  "children": []
                }
              ]
            },
            {
              "id": "7541d0ec-1b9a-48b1-a1cc-a9d09f0d2580",
              "slug": "dining-room-furniture",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "أثاث غرفة السفرة",
              "description": "اعثر على أرقى أثاث لغرفة السفرة، يشمل طاولات السفرة، الكراسي المريحة، البوفيهات (الدريسوار)، الفيترينات (خزائن الصيني)، وأطقم السفرة الكاملة.",
              "children": [
                {
                  "id": "e17b3b5b-ba02-4010-8f96-b4e3f9ea2990",
                  "slug": "dining-tables",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "طاولات السفرة",
                  "description": "طاولات سفرة أنيقة بجميع الأشكال والأحجام، تشمل الطاولات المدورة، المستطيلة، القابلة للتكبير، وبأسطح من الزجاج، الخشب، والرخام.",
                  "children": []
                },
                {
                  "id": "3110b126-7a8c-4ef6-8bcb-1402ece7ac4b",
                  "slug": "dining-chairs",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "كراسي السفرة",
                  "description": "كراسي سفرة مريحة وأنيقة، تشمل الكراسي المنجدة، الخشبية، المعدنية، وبتصاميم عصرية. متوفرة بشكل فردي أو ضمن أطقم كراسي سفرة.",
                  "children": []
                }
              ]
            },
            {
              "id": "70c5fd0b-f0b9-45eb-a2f3-5fc2e52dc2ee",
              "slug": "kitchen-furniture-cabinets",
              "icon": null,
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "أثاث وخزائن مطابخ",
              "description": "احصل على حلول مطابخ مخصصة وعصرية، تشمل خزائن المطبخ، الجزر، وحدات التخزين، وبارات الإفطار، المصممة لتناسب مساحتك بشكل مثالي.",
              "children": [
                {
                  "id": "878be9f6-2cd1-4fd5-b7c4-34763c9032a6",
                  "slug": "kitchen-cabinets",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "خزائن المطبخ",
                  "description": "خزائن مطبخ عصرية ومتينة، تشمل الخزائن العلوية، السفلية، وحدات التخزين الطويلة (المؤن)، وأنظمة خزائن مطبخ معيارية متكاملة.",
                  "children": []
                }
              ]
            },
            {
              "id": "f2abe7d2-5b35-4e71-a939-aed699331674",
              "slug": "office-furniture",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "أثاث مكتبي",
              "description": "جهز مساحة عملك بأثاث مكتبي احترافي، يشمل مكاتب مدراء، كراسي طبية مريحة، خزائن ملفات، مكتبات، وحلول متكاملة لتجهيز المكاتب.",
              "children": [
                {
                  "id": "ba9f7fc1-c20b-4e8f-a4e4-0c5cd230bbe8",
                  "slug": "office-desks",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "مكاتب",
                  "description": "مكاتب احترافية لأي مساحة عمل، تشمل مكاتب مدراء، مكاتب كمبيوتر، مكاتب وقوف عصرية، ومكاتب زاوية (L-shape) لتوفير المساحة.",
                  "children": []
                },
                {
                  "id": "6ecb0dfb-8b7d-4f1a-b93a-336dd23bdb1e",
                  "slug": "office-chairs",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "كراسي مكتب",
                  "description": "كراسي مكتب طبية ومريحة، تشمل كراسي مدراء جلدية، كراسي عملية بقماش شبكي، كراسي غرف اجتماعات، وكراسي مخصصة للألعاب (غيمنغ).",
                  "children": []
                }
              ]
            },
            {
              "id": "e95841a5-4bdd-47e6-a25d-8619738ea6f5",
              "slug": "outdoor-garden-furniture",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "أثاث حدائق وتراسات",
              "description": "استمتع بالهواء الطلق مع أثاث خارجي مقاوم للعوامل الجوية، يشمل أطقم تراسات، كراسي وطاولات حدائق، برجولات، مراجيح، وأثاث أنيق للمسابح.",
              "children": []
            },
            {
              "id": "53780c8c-a0e2-441f-a499-3659527ca498",
              "slug": "storage-organization",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "حلول التخزين والتنظيم",
              "description": "نظم بيتك مع حلول تخزين ذكية تشمل خزائن الملابس، كابينيهات، وحدات رفوف، خزائن أحذية، منظمات خزانة، وإكسسوارات تخزين مبتكرة.",
              "children": []
            },
            {
              "id": "9d5ab8f4-a191-4b36-a224-b56bda37b3b9",
              "slug": "home-decor-accessories",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "ديكور واكسسوارات منزلية",
              "description": "أضف اللمسة النهائية المثالية مع تشكيلتنا الواسعة من قطع الديكور المنزلي، التي تشمل المرايا، اللوحات الجدارية، المزهريات، الشموع، الساعات، واكسسوارات منزلية فريدة.",
              "children": []
            },
            {
              "id": "5bb0b312-b3c1-4329-b635-569e2c4d11c5",
              "slug": "lighting-electrical",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "الإضاءة والكهربائيات",
              "description": "أنر مساحتك مع حلول إضاءة عصرية تشمل الثريات، الإضاءة المعلقة، أباجورات الطاولة، المصابيح الأرضية، الأبليكات الجدارية، وأنظمة الإضاءة الذكية.",
              "children": []
            },
            {
              "id": "403834a4-6729-4e2a-b102-e58fe90453a5",
              "slug": "textiles-soft-furnishing",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "المنسوجات والمفروشات",
              "description": "اكتشف أجود أنواع المنسوجات والمفروشات التي تشمل الستائر (البرادي)، السجاد، الوسائد، مفارش السرير، الشراشف، وتشكيلة واسعة من أقمشة التنجيد.",
              "children": []
            },
            {
              "id": "67bfba0c-958b-4bc6-88a2-0288c588370a",
              "slug": "childrens-furniture",
              "icon": null,
              "image": null,
              "sort_order": 12,
              "level": 1,
              "name": "أثاث غرف أطفال",
              "description": "أثاث أطفال آمن، ممتع وملون، يشمل تخوت أطفال، مكاتب دراسة، وحدات تخزين ألعاب، تخوت بيبي، وأثاث متكامل لغرف اللعب.",
              "children": []
            },
            {
              "id": "f82ed405-da39-4451-a750-c96e2be95bba",
              "slug": "bathroom-furniture",
              "icon": null,
              "image": null,
              "sort_order": 13,
              "level": 1,
              "name": "أثاث حمامات",
              "description": "أثاث حمامات عصري، يشمل خزائن مغاسل، خزائن أدوية (صيدلية)، وحدات تخزين، مرايا مع إضاءة، واكسسوارات حمام أنيقة.",
              "children": []
            },
            {
              "id": "faf06f84-6e3f-49d8-8f2e-186916534cb2",
              "slug": "custom-builtin-furniture",
              "icon": null,
              "image": null,
              "sort_order": 15,
              "level": 1,
              "name": "أثاث تفصيل ومدمج",
              "description": "احصل على حلول أثاث تفصيل ومدمج، تشمل الموبيليا المصنوعة حسب الطلب، خزائن الحائط، وحلول تخزين مصممة خصيصاً على قياس مساحتك.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000006",
          "slug": "fashion-clothing",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752735233152-97d97494-a2d8-4451-95b0-56b8b820e5ab.webp",
          "image": null,
          "sort_order": 5,
          "level": 0,
          "name": "أزياء وملابس",
          "description": "اكتشف أحدث صيحات الموضة والملابس للرجال والنساء والأطفال. تصفح مجموعة متنوعة من الملابس والأحذية والإكسسوارات من مختلف الماركات.",
          "children": [
            {
              "id": "ba024b57-3448-4178-948b-90740181ad6f",
              "slug": "mens-clothing",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "أزياء رجالية",
              "description": "تشكيلة متكاملة من الأزياء الرجالية العصرية والكلاسيكية. كل ما تحتاجه من قمصان، بنطلونات، بدلات رسمية، جاكيتات، بالإضافة لملابس كاجوال يومية وألبسة رسمية للمناسبات الخاصة.",
              "children": [
                {
                  "id": "c1e3056d-346f-4978-b0c7-373d2b934c38",
                  "slug": "mens-clothing-items",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "ملابس",
                  "description": null,
                  "children": []
                },
                {
                  "id": "f9ed2939-439f-422d-bcd8-5600da51f1a0",
                  "slug": "mens-underwear",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "ملابس داخلية وملابس نوم رجالية",
                  "description": null,
                  "children": []
                },
                {
                  "id": "ccedd8d1-6f73-4369-893c-b44c0806e02f",
                  "slug": "mens-shoes",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "أحذية رجالية",
                  "description": "أحذية رجالية لكل المناسبات. أحذية رسمية، أحذية كاجوال، بوات، أحذية رياضية (سبور)، وموكاسين.",
                  "children": []
                }
              ]
            },
            {
              "id": "100a48fd-52d3-4c19-9a14-3d65cb42b550",
              "slug": "womens-clothing",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "أزياء نسائية",
              "description": "أحدث صيحات الموضة النسائية من فساتين، بلايز، بناطيل، تنانير، جاكيتات، ألبسة سهرة، وأزياء كاجوال عصرية تناسب كل الأذواق.",
              "children": [
                {
                  "id": "b1e512ec-413b-46b4-bf10-da1058a42220",
                  "slug": "womens-clothing-items",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "ملابس",
                  "description": null,
                  "children": []
                },
                {
                  "id": "c2bd8770-1d04-4c5a-9a1b-32172a0ddd94",
                  "slug": "womens-shoes",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "أحذية نسائية",
                  "description": "أحذية نسائية أنيقة ومريحة. أحذية كعب عالي، فلات، بوات، أحذية رياضية (سبور)، صنادل، وبامب.",
                  "children": []
                },
                {
                  "id": "fb948ec2-3056-4c27-bb59-b2a580391147",
                  "slug": "womens-underwear-sleepwear",
                  "icon": null,
                  "image": null,
                  "sort_order": 8,
                  "level": 2,
                  "name": "ملابس داخلية وملابس نوم",
                  "description": "ملابس داخلية وبيجامات مريحة للرجال والنساء. تشكيلة واسعة من حمالات الصدر، الكلسونات، البوكسرات، ملابس النوم، وألبسة البيت.",
                  "children": []
                },
                {
                  "id": "c63fdde9-9782-4499-bcc9-e213e99eb097",
                  "slug": "traditional-cultural-clothing",
                  "icon": null,
                  "image": null,
                  "sort_order": 9,
                  "level": 2,
                  "name": "أزياء شرقية وتراثية",
                  "description": "أزياء سورية وشرقية أصيلة. تشكيلة من العبايات، الجلابيات، القفطان، الأثواب المطرزة، والملابس التراثية التي تعكس ثقافة المنطقة.",
                  "children": []
                }
              ]
            },
            {
              "id": "c53f368e-1eae-448e-b1c6-7642923e2d57",
              "slug": "kids-fashion",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "أزياء أطفال",
              "description": "ملابس أطفال مريحة وأنيقة. تشكيلة كبيرة من ملابس الأولاد والبنات، أواعي بيبي، أزياء مدرسية، وألبسة موسمية لكافة الأعمار.",
              "children": [
                {
                  "id": "86a00c7e-c1f6-4b45-9681-3d9692896b41",
                  "slug": "boys-clothing",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "ملابس ولادي",
                  "description": "ملابس للأولاد تشمل قمصان، بنطلونات، شورتات، جاكيتات، زي مدرسي، وملابس كاجوال لكل الأعمار.",
                  "children": []
                },
                {
                  "id": "b0ae7472-642e-4dad-902d-030d38b54776",
                  "slug": "girls-clothing",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "ملابس بناتي",
                  "description": "ملابس للبنات تشمل فساتين، بلايز، تنانير، بنطلونات، جاكيتات، زي مدرسي، وفساتين حفلات.",
                  "children": []
                },
                {
                  "id": "6f878f6c-d427-4da4-b73b-c069e6d2a82e",
                  "slug": "childrens-shoes",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "أحذية أطفال",
                  "description": "أحذية للأطفال من كل الأعمار. أحذية مدرسة، أحذية رياضية (سبور)، صنادل، بوات، وأحذية بيبي.",
                  "children": []
                },
                {
                  "id": "697039b6-699e-4d13-b031-c27d9ee28dca",
                  "slug": "baby-clothing",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "ملابس بيبي",
                  "description": "ملابس للرضع وحديثي الولادة. أفرولات، تبانات، ملابس نوم، مريلات، بطانيات، وكل مستلزمات البيبي.",
                  "children": []
                }
              ]
            },
            {
              "id": "558b557c-0213-4e08-a04c-fa455011d986",
              "slug": "bags-accessories",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "حقائب واكسسوارات",
              "description": "تشكيلة واسعة من الحقائب والشنط عالية الجودة. حقائب يد نسائية، شنط ظهر، حقائب سفر، شنط لابتوب، محافظ، واكسسوارات سفر.",
              "children": [
                {
                  "id": "df43a53f-0f24-4c50-8cbd-72d87b53664a",
                  "slug": "other-accessories",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "اكسسوارات أخرى",
                  "description": null,
                  "children": []
                },
                {
                  "id": "66666666-6666-6666-6666-666666666666",
                  "slug": "bags-and-luggage-items",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "حقائب وشنط",
                  "description": null,
                  "children": []
                },
                {
                  "id": "d55dcdd5-c9e6-4ddf-baee-1495b4382c52",
                  "slug": "jewelry-and-watches",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "مجوهرات وساعات",
                  "description": null,
                  "children": []
                }
              ]
            },
            {
              "id": "0257ca7a-838b-4367-9b7e-e097f958ba52",
              "slug": "sportswear-and-shoes",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "ملابس وأحذية رياضية",
              "description": "ألبسة رياضية للنوادي والتمارين اليومية. ملابس جيم، أطقم جري، ملابس يوغا، بدلات رياضية، واكسسوارات لياقة بدنية.",
              "children": [
                {
                  "id": "b8cd7c24-d487-4b6c-9c4c-7f7312a52f82",
                  "slug": "sports-shoes",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "أحذية رياضية (سبور)",
                  "description": "أحذية رياضية متخصصة. أحذية جري، أحذية كرة سلة، أحذية كرة قدم، أحذية تدريب، ولكافة النشاطات الرياضية.",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000040",
          "slug": "generators-power",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752734989176-e9ddf7e2-0f51-4a17-b064-1c812ad002ca.webp",
          "image": null,
          "sort_order": 6,
          "level": 0,
          "name": "مولدات وطاقة",
          "description": "اضمن إمدادًا موثوقًا للطاقة مع مجموعتنا من المولدات ومعدات الطاقة. اعثر على مولدات بجميع الأحجام، وأنظمة UPS، وحلول طاقة أخرى لمنزلك أو عملك.",
          "children": [
            {
              "id": "5218cdf6-8189-40bb-a780-8eff81aa25c7",
              "slug": "generators",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "مولدات كهرباء",
              "description": "تشكيلة متكاملة من مولدات الكهرباء. بتلاقي عنا مولدات محمولة (شنطة)، ثابتة، ديزل، وبنزين. حلول طاقة موثوقة للبيت والمكتب والشغل.",
              "children": [
                {
                  "id": "07a20c6b-489a-4cfa-b5ad-12eb197add21",
                  "slug": "portable-generators",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "مولدات محمولة (شنطة)",
                  "description": "مولدات محمولة (شنطة) سهلة النقل. مثالية للرحلات، مواقع البناء، أو كحل طوارئ سريع للبيت أو المحل.",
                  "children": []
                },
                {
                  "id": "2fc97b30-eee0-4c58-b401-a4a7a108b904",
                  "slug": "standby-generators",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "مولدات ثابتة (احتياطية)",
                  "description": "مولدات ثابتة للمنازل والمشاريع التجارية. تعمل أوتوماتيكياً عند انقطاع الكهرباء بفضل لوحة القلاب الأوتوماتيكي (ATS).",
                  "children": []
                },
                {
                  "id": "ef541251-637c-4543-b9e0-6e90a42f379c",
                  "slug": "diesel-generators",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "مولدات ديزل",
                  "description": "مولدات ديزل اقتصادية وموثوقة. مناسبة للاستخدام الصناعي والتجاري وتشغيل الأحمال الثقيلة لفترات طويلة.",
                  "children": []
                },
                {
                  "id": "d062eef2-2b62-4467-adee-edbb84a5330c",
                  "slug": "petrol-gas-generators",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "مولدات بنزين",
                  "description": "مولدات بنزين خفيفة الوزن وعملية. خيار مثالي للاستخدام المنزلي، المحلات الصغيرة، واحتياجات الطاقة المؤقتة.",
                  "children": []
                },
                {
                  "id": "b645898c-4d4b-49ad-96d7-bd45974f6050",
                  "slug": "industrial-generators",
                  "icon": null,
                  "image": null,
                  "sort_order": 5,
                  "level": 2,
                  "name": "مولدات صناعية",
                  "description": "مولدات صناعية باستطاعات عالية جداً. مصممة للمصانع، المستشفيات، مراكز البيانات، والمنشآت التجارية الكبيرة.",
                  "children": []
                }
              ]
            },
            {
              "id": "0a4c3d4a-6ba5-4729-97ad-0982c3079ac5",
              "slug": "ups-systems",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "أجهزة يو بي إس (UPS)",
              "description": "أجهزة تزويد طاقة غير منقطعة (UPS) لحماية أجهزتك الإلكترونية من انقطاع الكهرباء المفاجئ. متوفرة للاستخدام المنزلي والمكتبي والصناعي.",
              "children": [
                {
                  "id": "bf3f9709-099e-425a-bfc1-97a5229429bb",
                  "slug": "home-ups",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "يو بي إس منزلي",
                  "description": "يو بي إس للاستخدام المنزلي. مثالي لحماية الكمبيوتر، الراوتر، التلفزيون، والأجهزة الأساسية الأخرى من الانقطاع المفاجئ للكهرباء.",
                  "children": []
                },
                {
                  "id": "1e4a8043-0dfb-49ff-8335-c6111563b69c",
                  "slug": "office-ups",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "يو بي إس مكتبي",
                  "description": "يو بي إس للمكاتب والشركات. يوفر حماية لأجهزة الكمبيوتر، السيرفرات، ومعدات الشبكة لضمان استمرارية العمل.",
                  "children": []
                },
                {
                  "id": "845183de-860e-45d5-9452-b14965880ae3",
                  "slug": "industrial-ups",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "يو بي إس صناعي",
                  "description": "يو بي إس صناعي باستطاعات عالية. مصمم للتطبيقات الحساسة في المصانع والمستشفيات التي لا تحتمل انقطاع الطاقة نهائياً.",
                  "children": []
                }
              ]
            },
            {
              "id": "2e1657b4-a002-44db-8455-8eef54ce0f87",
              "slug": "solar-power-systems",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "منظومات طاقة شمسية",
              "description": "حلول طاقة شمسية متكاملة. استفد من الشمس ووفر بفاتورة الكهرباء. نوفر ألواح، انفرترات، بطاريات، منظمات شحن، وكل مستلزمات الطاقة النظيفة.",
              "children": [
                {
                  "id": "8bf3ad08-c73b-46f2-838a-31d307590d3a",
                  "slug": "solar-panels",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "ألواح طاقة شمسية",
                  "description": "ألواح شمسية عالية الكفاءة. متوفر ألواح مونوكريستالين وبوليكريستالين بأفضل الماركات العالمية لتوليد أقصى طاقة ممكنة.",
                  "children": []
                },
                {
                  "id": "675efb36-e7ad-4298-8f51-aa9de42bb070",
                  "slug": "solar-inverters",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "انفرترات طاقة شمسية",
                  "description": "انفرترات مخصصة لمنظومات الطاقة الشمسية. متوفر انفرترات هايبرد، عادية، ومايكرو انفرتر لتحويل طاقة الألواح بكفاءة.",
                  "children": []
                },
                {
                  "id": "014be216-7b97-4f79-9ce6-231952d2964d",
                  "slug": "solar-batteries",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "بطاريات طاقة شمسية",
                  "description": "بطاريات دورة عميقة لتخزين الطاقة الشمسية. بطاريات ليثيوم، جل، وAGM مصممة لتدوم طويلاً مع منظومتك.",
                  "children": []
                },
                {
                  "id": "1b8684fb-2321-4192-9b37-981c1b62a896",
                  "slug": "solar-charge-controllers",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "منظمات شحن شمسية",
                  "description": "منظمات شحن لحماية بطارياتك وتنظيم عملية الشحن من الألواح. متوفر منظمات MPPT عالية الكفاءة و PWM الاقتصادية.",
                  "children": []
                }
              ]
            },
            {
              "id": "d42be68c-8b78-4632-afe1-f7a312a983c6",
              "slug": "power-tools",
              "icon": null,
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "أدوات كهربائية (عدة شغل)",
              "description": "عدة شغل كهربائية للمحترفين والهواة. دريلات، مناشير، جلاخات (صواريخ)، حفّافات، وأطقم عدة كاملة تعمل بالكهرباء أو بالبطارية.",
              "children": [
                {
                  "id": "e436739c-718e-4f30-9189-a930376e7286",
                  "slug": "electric-power-tools",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "عدة شغل كهربائية (سلكية)",
                  "description": "عدة شغل كهربائية سلكية لأداء قوي ومستمر. دريلات، مناشير، جلاخات (صواريخ)، وحفّافات للمحترفين.",
                  "children": []
                },
                {
                  "id": "8d9f9205-7146-4a2b-9c7c-b113053ea1a8",
                  "slug": "battery-power-tools",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "عدة شغل لاسلكية (بطارية)",
                  "description": "عدة شغل لاسلكية تعمل بالبطارية لحرية الحركة والعمل في أي مكان. دريلات، مفكات صدم، مناشير دائرية، وأطقم كاملة.",
                  "children": []
                }
              ]
            },
            {
              "id": "5a7ccea9-f3cd-48bd-a2d2-0618760a2542",
              "slug": "electrical-equipment",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "تجهيزات ومستلزمات كهربائية",
              "description": "كل ما يلزم للتمديدات الكهربائية. كبسات (مفاتيح)، برايز (مآخذ)، قواطع أمان، طبلونات كهرباء، وكل اكسسوارات التأسيس والتركيب.",
              "children": []
            },
            {
              "id": "f67462c7-537b-4767-83e5-53664f883593",
              "slug": "batteries",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "بطاريات",
              "description": "جميع أنواع البطاريات. بطاريات للسيارات، لمنظومات الطاقة الشمسية، ولليو بي إس. متوفر بطاريات أنبوبية، جل، وبطاريات قابلة للشحن.",
              "children": []
            },
            {
              "id": "85242457-8e34-46ff-aa89-4b14e7981172",
              "slug": "inverters-converters",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "انفرترات (عاكسات)",
              "description": "انفرترات لتحويل كهرباء البطارية (DC) لكهرباء 220 فولت (AC) لتشغيل أجهزتك. متوفرة بقدرات مختلفة لتناسب كل الاحتياجات.",
              "children": []
            },
            {
              "id": "21b202d5-580a-4fa5-b4dd-a591fc3c04da",
              "slug": "voltage-stabilizers",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "منظمات جهد (ستبلايزر)",
              "description": "منظمات جهد (ستبلايزر) لتحمي أجهزتك الكهربائية من مشكلة تذبذب الكهرباء وضعفها. ضرورية للبرادات والتلفزيونات والأجهزة الحساسة.",
              "children": []
            },
            {
              "id": "f3a5ed03-cc88-45b1-969a-d0c591299016",
              "slug": "power-cables-wiring",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "كابلات وأسلاك كهرباء",
              "description": "كابلات وأسلاك كهرباء نحاس أصلي. متوفر جميع المقاسات (شريط) للتمديدات المنزلية والصناعية، بالإضافة لوصلات التمديد (سيار).",
              "children": []
            },
            {
              "id": "a87a4b92-a056-4e23-8178-eb25950c5185",
              "slug": "lighting-equipment",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "إنارة ومعدات إضاءة",
              "description": "حلول إنارة موفرة للطاقة. لمبات ليد (LED)، كشافات، إنارة طوارئ، وبواطات (ضو يد) قوية للاستخدام الشخصي والمهني.",
              "children": []
            },
            {
              "id": "50646557-e881-4333-814b-d4a0d510c99b",
              "slug": "electrical-safety-equipment",
              "icon": null,
              "image": null,
              "sort_order": 11,
              "level": 1,
              "name": "معدات السلامة الكهربائية",
              "description": "معدات لحمايتك أثناء العمل بالكهرباء. قواطع تفاضلية (حماية من التكهرب)، واقيات من ارتفاع الجهد، كفوف عازلة، وأجهزة فحص.",
              "children": []
            },
            {
              "id": "1c244e01-c856-477d-8cd4-ac41e34e2b52",
              "slug": "power-distribution",
              "icon": null,
              "image": null,
              "sort_order": 12,
              "level": 1,
              "name": "لوحات وتجهيزات توزيع الطاقة",
              "description": "تجهيزات توزيع الكهرباء للمشاريع والمباني. طبلونات (لوحات توزيع)، قواطع رئيسية، ومراكز تجميع الأحمال.",
              "children": []
            },
            {
              "id": "55a18daa-9886-4c0c-9219-9da68acb79b2",
              "slug": "renewable-energy",
              "icon": null,
              "image": null,
              "sort_order": 13,
              "level": 1,
              "name": "حلول الطاقة المتجددة",
              "description": "حلول الطاقة البديلة والمستدامة. بالإضافة للطاقة الشمسية، نوفر معلومات ومعدات حول توربينات الرياح والطاقة الكهرومائية الصغيرة.",
              "children": []
            },
            {
              "id": "deb0053e-741a-4197-acec-b59a3e9a531f",
              "slug": "generator-parts-accessories",
              "icon": null,
              "image": null,
              "sort_order": 14,
              "level": 1,
              "name": "قطع غيار واكسسوارات المولدات",
              "description": "كل ما تحتاجه لصيانة مولدتك. فلاتر، بواجي، أطقم صيانة، خزانات وقود، أغطية حماية، وجميع قطع الغيار اللازمة.",
              "children": []
            },
            {
              "id": "23083bd4-4368-470a-b480-081c3314d4fa",
              "slug": "power-monitoring",
              "icon": null,
              "image": null,
              "sort_order": 15,
              "level": 1,
              "name": "أجهزة قياس ومراقبة الطاقة",
              "description": "أجهزة لقياس ومراقبة استهلاك الكهرباء. ساعات قياس، أجهزة مراقبة الطاقة، ومعدات فحص واختبار كهربائية دقيقة.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000007",
          "slug": "beauty-personal-care",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752738565775-bb15bf99-d448-48b9-83da-7762aa5ccfb4.webp",
          "image": null,
          "sort_order": 7,
          "level": 0,
          "name": "جمال وعناية شخصية",
          "description": "اكتشف عالمًا من منتجات الجمال والعناية الشخصية. اعثر على كل شيء من المكياج والعناية بالبشرة إلى العطور والعناية بالشعر لتعزيز جمالك الطبيعي.",
          "children": [
            {
              "id": "560283f5-f2bb-4aec-b676-78056d42c4da",
              "slug": "skincare",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "العناية بالبشرة",
              "description": "كل ما تحتاجه بشرتك للعناية اليومية. تشكيلة واسعة من غسولات الوجه، كريمات الترطيب، السيرومات، ومنتجات علاجية لمكافحة التجاعيد وحب الشباب.",
              "children": [
                {
                  "id": "272abd07-293b-44d8-ab37-80818bd444c6",
                  "slug": "cleansers",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "غسول ومنظفات البشرة",
                  "description": "منظفات بشرة لطيفة وفعالة. غسول جل، رغوة، أو زيتي، بالإضافة لماء الميسيلار ومزيلات المكياج لكافة أنواع البشرة.",
                  "children": []
                },
                {
                  "id": "bde494fe-84d6-4159-a065-3f04b91ca8ba",
                  "slug": "moisturizers",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "كريمات مرطبة",
                  "description": "كريمات ترطيب للوجه والجسم. كريمات نهارية مع حماية شمسية، كريمات ليلية مغذية، ولوشنات لترطيب عميق.",
                  "children": []
                },
                {
                  "id": "d24b7cd2-ef16-42c2-9210-144c71e8aaa3",
                  "slug": "serums-treatments",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "سيرومات وعلاجات",
                  "description": "سيرومات مركزة لحل مشاكل البشرة. سيروم فيتامين سي للنضارة، هيالورونيك أسيد للترطيب، وريتينول للتجاعيد.",
                  "children": []
                },
                {
                  "id": "0a27fb60-6a81-40a1-9928-3b084b204a1e",
                  "slug": "acne-blemish-care",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "علاج حب الشباب وآثاره",
                  "description": "منتجات متخصصة لعلاج حب الشباب وآثاره. كريمات تجفيف الحبوب، غسول للبشرة المعرضة لحب الشباب، ومنتجات بحمض الساليسيليك.",
                  "children": []
                },
                {
                  "id": "c544c98b-c49a-4205-a200-4275ccb9ef69",
                  "slug": "anti-aging-treatment",
                  "icon": null,
                  "image": null,
                  "sort_order": 15,
                  "level": 1,
                  "name": "مكافحة التجاعيد وعلاجات متقدمة",
                  "description": "علاجات متقدمة لبشرة شابة ومشدودة. كريمات وسيرومات غنية بالريتينول وحمض الهيالورونيك لمحاربة علامات التقدم بالسن.",
                  "children": []
                }
              ]
            },
            {
              "id": "6a1b0377-9af1-42a6-966a-1ff0c801fe54",
              "slug": "makeup-cosmetics",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "مكياج ومستحضرات تجميل",
              "description": "مجموعة مكياج متكاملة لإطلالة مثالية كل يوم. فونديشن، حمرة، آيشادو، مسكارا، بلاشر، كونسيلر، وكل مستحضرات التجميل من ماركات عالمية.",
              "children": [
                {
                  "id": "8eff4da2-bd1a-499d-8d91-ea7473e9dc03",
                  "slug": "face-makeup",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "مكياج الوجه",
                  "description": "مكياج لتغطية مثالية وإشراقة طبيعية. فونديشن، كونسيلر، بودرة، بلاشر، برونزر، وهايلايتر.",
                  "children": []
                },
                {
                  "id": "f2973480-a2b3-46d7-8ada-b468b67905ad",
                  "slug": "eye-makeup",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "مكياج العيون",
                  "description": "لعيون جذابة ونظرة ساحرة. باليتات آيشادو، مسكارا لتكثيف الرموش، آيلاينر، وقلم حواجب.",
                  "children": []
                },
                {
                  "id": "fcd8e5ad-ca99-4779-b58c-e5d3ad65214e",
                  "slug": "lip-makeup",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "مكياج الشفاه (حمرة)",
                  "description": "ألوان حمرة جذابة ومميزة. حمرة مات، حمرة سائلة، ملمع شفاه (غلوس)، وأقلام تحديد الشفاه.",
                  "children": []
                }
              ]
            },
            {
              "id": "7aeca960-db22-45f0-87cd-c1dbad1f74cd",
              "slug": "hair-care",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "العناية بالشعر",
              "description": "حلول متكاملة لكل مشاكل الشعر. شامبو، بلسم، ماسكات علاجية، منتجات تصفيف، وزيوت وسيرومات لتقوية الشعر ومنع التساقط.",
              "children": [
                {
                  "id": "061342ef-de66-49f4-8abc-55bcd12b2023",
                  "slug": "shampoo-conditioner",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "شامبو وبلسم",
                  "description": "شامبو وبلسم لكل أنواع الشعر. للشعر الجاف، الدهني، المصبوغ، والمعالج بالبروتين. متوفر أنواع طبية وخالية من السلفات.",
                  "children": []
                },
                {
                  "id": "d6ecc85e-e106-423a-b743-0c2efc234628",
                  "slug": "hair-styling",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "مصففات شعر",
                  "description": "منتجات لتثبيت وتسريح الشعر. جل، موس، سبراي مثبت، كريم تصفيف، وبخاخ حماية من حرارة السشوار.",
                  "children": []
                },
                {
                  "id": "473c3695-e0aa-45c2-ae8a-72bd32b2915e",
                  "slug": "hair-treatments",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "ماسكات وزيوت وعلاجات للشعر",
                  "description": "علاجات مكثفة للشعر. ماسكات مغذية، زيوت طبيعية، سيرومات لمنع التقصف، شامبو ضد القشرة، وأمبولات لتكثيف الشعر.",
                  "children": []
                }
              ]
            },
            {
              "id": "c9ff2063-c11c-4b56-b65f-07cb9c9f77eb",
              "slug": "mens-grooming",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "العناية بالرجل",
              "description": "كل ما يحتاجه الرجل العصري للعناية بمظهره. منتجات حلاقة، زيوت وبلسم للعناية باللحية، كريمات بشرة رجالية، وعطورات منعشة.",
              "children": [
                {
                  "id": "7f9baeea-eba5-4d91-bc05-1b81df3f33fb",
                  "slug": "shaving-products",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "مستلزمات الحلاقة",
                  "description": "كل ما يلزمك لحلاقة ناعمة ومريحة. شفرات حلاقة، جل أو رغوة حلاقة، بلسم ما بعد الحلاقة (أفترشيف)، وفرشاة حلاقة.",
                  "children": []
                },
                {
                  "id": "4d19d9e5-f013-471c-b8cd-42f7035a3bfb",
                  "slug": "beard-care",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "العناية باللحية والشارب",
                  "description": "للحية صحية ومرتبة. زيت لحية للترطيب، بلسم للتنعيم، شامبو خاص باللحية، ومجموعة أدوات التشذيب.",
                  "children": []
                },
                {
                  "id": "b67cc4b1-5ece-438e-a103-39ff6e292d48",
                  "slug": "mens-skincare",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "العناية ببشرة الرجل",
                  "description": "مستحضرات عناية بالبشرة مصممة خصيصاً للرجل. غسول وجه، كريم مرطب، وكريمات لمكافحة التجاعيد.",
                  "children": []
                }
              ]
            },
            {
              "id": "3060e159-24c1-4e10-8f9e-ab9e38dcaa39",
              "slug": "organic-natural-products",
              "icon": null,
              "image": null,
              "sort_order": 12,
              "level": 1,
              "name": "منتجات طبيعية وعضوية",
              "description": "جمالك من قلب الطبيعة. مستحضرات عناية وتجميل عضوية وطبيعية 100%، خالية من الكيماويات ومصنوعة من مكونات نباتية.",
              "children": []
            },
            {
              "id": "259401fb-89e1-4b77-b1b0-7afa703c8062",
              "slug": "fragrances-perfumes",
              "icon": null,
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "عطورات",
              "description": "أفخم العطورات العالمية والشرقية. تشكيلة واسعة من عطور نسائية ورجالية، بالإضافة لبودي سبراي وكولونيا لإحساس دائم بالانتعاش.",
              "children": []
            },
            {
              "id": "ffb96f61-c69e-4419-b3aa-2541db5554cc",
              "slug": "personal-hygiene",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "النظافة الشخصية",
              "description": "أساسيات النظافة الشخصية اليومية. صابون، سائل استحمام، ديودوران، منتجات العناية النسائية الخاصة، وكل ما يلزم للانتعاش والثقة.",
              "children": []
            },
            {
              "id": "08a06616-7dcb-4453-b482-16ad868fed2e",
              "slug": "nail-care",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "العناية بالأظافر",
              "description": "كل ما يلزمك لأظافرสวยة وصحية. ألوان مناكير عصرية، مقويات وعلاجات للأظافر، ومجموعة كاملة لأدوات المانكير والبديكير.",
              "children": []
            },
            {
              "id": "afbb9586-a05d-4b34-b054-5217c51ad7a8",
              "slug": "body-care",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "العناية بالجسم",
              "description": "مستحضرات لنعومة وترطيب فائق للجسم. كريمات ولوشنات مرطبة، مقشرات (سكراب) لتجديد البشرة، زيوت عطرية، وزبدة جسم مغذية.",
              "children": []
            },
            {
              "id": "e387295b-6818-4b54-990e-7c4f7af2c389",
              "slug": "oral-care",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "العناية بالفم والأسنان",
              "description": "لابتسامة صحية ونفس منعش. معجون أسنان، فرشاة أسنان، غسول فم، خيط طبي، ومنتجات تبييض الأسنان.",
              "children": []
            },
            {
              "id": "02f21ce7-c9a0-43a1-9428-1580c7100125",
              "slug": "health-wellness",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "فيتامينات ومكملات غذائية",
              "description": "ادعمي صحتك وجمالك من الداخل. تشكيلة من الفيتامينات الأساسية، المكملات الغذائية لدعم الشعر والبشرة، ومستلزمات صحية أساسية.",
              "children": []
            },
            {
              "id": "04c72f99-a5fa-49f9-87e2-a40f930c16c7",
              "slug": "beauty-tools-accessories",
              "icon": null,
              "image": null,
              "sort_order": 11,
              "level": 1,
              "name": "أدوات واكسسوارات تجميل",
              "description": "الأدوات المثالية لتطبيق مكياجك وتصفيف شعرك باحتراف. فرش مكياج، سبونجات، سشوار وفير للشعر، ومرايا مكبرة.",
              "children": []
            },
            {
              "id": "84cfc1c9-bbdf-442d-8270-6f8b8b24a43e",
              "slug": "baby-care",
              "icon": null,
              "image": null,
              "sort_order": 13,
              "level": 1,
              "name": "العناية بالطفل والرضع",
              "description": "منتجات لطيفة وآمنة على بشرة طفلك. شامبو أطفال بدون دموع، لوشنات مرطبة، حفاضات، مناديل مبللة، وكل مستلزمات العناية بالرضع.",
              "children": []
            },
            {
              "id": "347383a1-1c75-4d83-b375-260e1c6f4601",
              "slug": "sun-care",
              "icon": null,
              "image": null,
              "sort_order": 14,
              "level": 1,
              "name": "واقيات شمسية",
              "description": "حماية قصوى من أشعة الشمس الضارة. واقيات شمسية بعامل حماية (SPF) عالي، لوشنات ما بعد التعرض للشمس، ومنتجات تسمير آمنة.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000009",
          "slug": "pets-animals",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752738711786-b38efd1c-b403-4418-a1a2-dfb2418d2d1b.webp",
          "image": null,
          "sort_order": 8,
          "level": 0,
          "name": "حيوانات أليفة وطيور",
          "description": "اعثر على صديقك الجديد من الحيوانات الأليفة أو الطيور! تصفح إعلاناتنا للقطط والكلاب والطيور والحيوانات الأليفة الأخرى للبيع. لدينا أيضًا مجموعة واسعة من مستلزمات وإكسسوارات الحيوانات الأليفة.",
          "children": [
            {
              "id": "79c68f03-fd0f-46e3-8341-5e09874b13a2",
              "slug": "pets-for-sale-adoption",
              "icon": null,
              "image": null,
              "sort_order": 0,
              "level": 1,
              "name": "حيوانات للبيع أو التبني",
              "description": "اعثر على حيوانك الأليف القادم. كلاب، قطط، طيور، وغيرها للبيع أو التبني.",
              "children": [
                {
                  "id": "e11fd434-5c7b-4414-9c73-a54ca0eaa1dd",
                  "slug": "birds-for-sale",
                  "icon": null,
                  "image": null,
                  "sort_order": 30,
                  "level": 2,
                  "name": "طيور للبيع",
                  "description": null,
                  "children": []
                },
                {
                  "id": "34ce1ee4-1452-481e-afad-d346e930f60c",
                  "slug": "dogs-for-sale",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "كلاب للبيع",
                  "description": null,
                  "children": []
                },
                {
                  "id": "6ac77a20-9908-49e9-aa01-6ce090f530eb",
                  "slug": "cats-for-sale",
                  "icon": null,
                  "image": null,
                  "sort_order": 20,
                  "level": 2,
                  "name": "قطط للبيع",
                  "description": null,
                  "children": []
                },
                {
                  "id": "cc93a471-e78b-4285-b2af-a96e79dac37d",
                  "slug": "fish-for-sale",
                  "icon": null,
                  "image": null,
                  "sort_order": 40,
                  "level": 2,
                  "name": "أسماك زينة للبيع",
                  "description": null,
                  "children": []
                },
                {
                  "id": "c1a5b8e0-3d7f-4b0a-9c1e-8a7b6c5d4f3b",
                  "slug": "rabbits-for-sale",
                  "icon": null,
                  "image": null,
                  "sort_order": 55,
                  "level": 2,
                  "name": "أرانب للبيع",
                  "description": null,
                  "children": []
                },
                {
                  "id": "d4f08895-8106-476a-8af1-162faa7de282",
                  "slug": "exotic-pets-for-sale",
                  "icon": null,
                  "image": null,
                  "sort_order": 60,
                  "level": 2,
                  "name": "حيوانات نادرة للبيع",
                  "description": null,
                  "children": []
                }
              ]
            },
            {
              "id": "f7f8f0b4-4355-4c3b-8edd-ddf41020ba5b",
              "slug": "pet-supplies-and-products",
              "icon": null,
              "image": null,
              "sort_order": 100,
              "level": 2,
              "name": "مستلزمات الحيوانات الأليفة",
              "description": "جميع مستلزمات ومنتجات الحيوانات الأليفة من طعام وألعاب وإكسسوارات.",
              "children": [
                {
                  "id": "a0a1a2a3-b1b2-c3c4-d5d6-e1e2e3e4e5e6",
                  "slug": "pet-food-and-treats",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "أطعمة ومكافآت",
                  "description": null,
                  "children": []
                },
                {
                  "id": "a326cab3-1e27-49ae-8050-e6dcd0d4b7a7",
                  "slug": "fish-aquarium-supplies-new",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "مستلزمات الأسماك والأحواض",
                  "description": "جهز حوض السمك المثالي. أحواض سمك بكل الأحجام، فلاتر، سخانات، أكل سمك، ديكورات، وجميع اكسسوارات أحواض الزينة.",
                  "children": []
                },
                {
                  "id": "fd6d033c-0d26-467f-8e6a-5d12283fa6a7",
                  "slug": "small-animals-supplies",
                  "icon": null,
                  "image": null,
                  "sort_order": 5,
                  "level": 2,
                  "name": "مستلزمات الحيوانات الصغيرة",
                  "description": "مستلزمات الحيوانات الأليفة الصغيرة. أقفاص، نشارة، وأكل للأرانب، الهامستر، وغيرها من الحيوانات الصغيرة اللطيفة.",
                  "children": []
                },
                {
                  "id": "7d1cf876-fd8d-4ed1-85d1-757c899bb56b",
                  "slug": "pet-health-veterinary",
                  "icon": null,
                  "image": null,
                  "sort_order": 7,
                  "level": 2,
                  "name": "صحة وعلاجات بيطرية",
                  "description": "لصحة حيوانك الأليف. فيتامينات، أدوية، مستلزمات إسعافات أولية، ومنتجات للعناية بالأسنان والفم.",
                  "children": []
                },
                {
                  "id": "b1b77479-3283-423c-8ca3-e98a8ad72e5a",
                  "slug": "pet-grooming-hygiene-new",
                  "icon": null,
                  "image": null,
                  "sort_order": 8,
                  "level": 2,
                  "name": "العناية والنظافة",
                  "description": "لحيوان أليف نظيف وأنيق. شامبو، فرشاة شعر، مقص أظافر، أدوات حلاقة، وكل مستلزمات النظافة.",
                  "children": []
                },
                {
                  "id": "628bb8bd-fd56-4979-88a6-2ed8b4fc400b",
                  "slug": "pet-toys-entertainment-new",
                  "icon": null,
                  "image": null,
                  "sort_order": 9,
                  "level": 2,
                  "name": "ألعاب حيوانات أليفة",
                  "description": "ألعاب لتسلية وطاقة حيوانك الأليف. ألعاب تفاعلية، ألعاب عض، كرات، وألعاب ذكاء للقطط والكلاب.",
                  "children": []
                },
                {
                  "id": "852e1cdb-db25-4165-9248-64bf08890570",
                  "slug": "pet-accessories-gear",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "اكسسوارات حيوانات أليفة",
                  "description": "اكسسوارات لأناقة حيوانك الأليف. أطواق، ملابس، بطانيات، وبطاقات تعريف (ID tags) بتصاميم مميزة.",
                  "children": []
                },
                {
                  "id": "02f7afd1-624d-4864-9f16-b3619947f953",
                  "slug": "pet-training-behavior",
                  "icon": null,
                  "image": null,
                  "sort_order": 11,
                  "level": 2,
                  "name": "مستلزمات التدريب",
                  "description": "لتربية وتدريب أسهل. مكافآت تدريب (تريتس)، كليكر، مفارش تدريب على الحمام، ومساعدات سلوكية.",
                  "children": []
                },
                {
                  "id": "8d5c8287-e2a5-4b07-8116-bf337e0a01b4",
                  "slug": "pet-housing-habitats",
                  "icon": null,
                  "image": null,
                  "sort_order": 12,
                  "level": 2,
                  "name": "بيوت وأقفاص",
                  "description": "وفر مسكن مريح لحيوانك الأليف. بيوت كلاب، بيوت وأبراج للقطط، أقفاص طيور، وأحواض سمك.",
                  "children": []
                },
                {
                  "id": "cbd5732c-2ad0-40b8-bc38-122073db75ff",
                  "slug": "pet-transportation",
                  "icon": null,
                  "image": null,
                  "sort_order": 13,
                  "level": 2,
                  "name": "مستلزمات التنقل والسفر",
                  "description": "لتنقل آمن ومريح مع حيوانك الأليف. بوكسات تنقل، حقائب ظهر، مقاعد سيارة، وكل اكسسوارات السفر.",
                  "children": []
                },
                {
                  "id": "90c82efa-c982-491b-9282-9185ee13cd4b",
                  "slug": "pet-safety-security",
                  "icon": null,
                  "image": null,
                  "sort_order": 14,
                  "level": 2,
                  "name": "مستلزمات الأمان والسلامة",
                  "description": "للحفاظ على سلامة حيوانك الأليف. أجهزة تتبع GPS، بوابات أمان للمنزل، أطواق عاكسة للضوء، وأضواء أمان.",
                  "children": []
                },
                {
                  "id": "9bb78e78-caca-4f7e-9055-f86cb246ad26",
                  "slug": "exotic-pets-supplies",
                  "icon": null,
                  "image": null,
                  "sort_order": 15,
                  "level": 2,
                  "name": "مستلزمات الحيوانات النادرة",
                  "description": "مستلزمات للحيوانات النادرة والزواحف. أحواض خاصة، أكل متخصص، معدات تدفئة وإضاءة، واكسسوارات أخرى.",
                  "children": []
                }
              ]
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000010",
          "slug": "health-medical",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752738933988-59930a35-8f8d-4501-8d8f-247ebc354f6d.webp",
          "image": null,
          "sort_order": 9,
          "level": 0,
          "name": "صحة وطبية",
          "description": "اعثر على مجموعة واسعة من المنتجات والمعدات الصحية والطبية. تصفح قوائم الفيتامينات والمكملات الغذائية والأجهزة الطبية ومواد العناية الشخصية لدعم صحتك.",
          "children": [
            {
              "id": "a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6",
              "slug": "pediatric-health",
              "icon": null,
              "image": null,
              "sort_order": 0,
              "level": 1,
              "name": "صحة الأطفال",
              "description": null,
              "children": [
                {
                  "id": "a2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7",
                  "slug": "pediatric-medications",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "أدوية الأطفال",
                  "description": null,
                  "children": []
                },
                {
                  "id": "f1e2d3c4-b5a6-f7e8-d9c0-b1a2c3d4e5f6",
                  "slug": "pediatric-vitamins",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "فيتامينات الأطفال",
                  "description": null,
                  "children": []
                }
              ]
            },
            {
              "id": "efd4703d-2f6d-4d3e-9cac-bb309b79b89e",
              "slug": "medical-equipment-devices",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "تجهيزات ومعدات طبية",
              "description": "تجهيزات ومعدات طبية احترافية للمنزل والعيادات. أجهزة تشخيص، أجهزة مراقبة (ضغط، سكر، أكسجة)، أجهزة علاجية، وأدوات طبية متنوعة.",
              "children": [
                {
                  "id": "13c9c909-0651-4679-9689-836653bba5dc",
                  "slug": "blood-pressure-monitors",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "أجهزة قياس الضغط",
                  "description": "أجهزة قياس ضغط الدم للاستخدام المنزلي. أجهزة رقمية للمعصم أو الزند، وأجهزة يدوية (زئبقية وهوائية).",
                  "children": []
                },
                {
                  "id": "e5068b0c-33f1-4057-82bd-f482a6af9be0",
                  "slug": "thermometers",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "موازين حرارة طبية",
                  "description": "موازين حرارة لقياس دقيق وسريع. موازين رقمية، موازين تعمل بالأشعة تحت الحمراء (عن بعد) للجبهة والأذن.",
                  "children": []
                },
                {
                  "id": "aa00d729-bdcc-4777-a8ad-55b7ac455609",
                  "slug": "glucose-meters",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "أجهزة قياس السكر",
                  "description": "أجهزة فحص السكر بالدم. أجهزة قياس، شرائط فحص، إبر وخز (لانست)، وكل مستلزمات مرضى السكري.",
                  "children": []
                },
                {
                  "id": "75088f25-f379-4fa9-bf67-2a5d8b1d9e30",
                  "slug": "pulse-oximeters",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "أجهزة قياس الأكسجة",
                  "description": "أجهزة لقياس نسبة الأكسجين بالدم ونبضات القلب. أجهزة توضع على الإصبع، سهلة الاستخدام ومناسبة للكبار والأطفال.",
                  "children": []
                }
              ]
            },
            {
              "id": "10a7e6de-0e93-43b2-a338-3f0d56b621ab",
              "slug": "vitamins-supplements",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "فيتامينات ومكملات غذائية",
              "description": "كل ما تحتاجه لدعم صحتك. فيتامينات، معادن، مكملات عشبية، بروتينات للرياضيين، وكل المكملات الغذائية لتقوية الجسم والمناعة.",
              "children": [
                {
                  "id": "1e0a24d6-13df-433a-beeb-e6d2740de64c",
                  "slug": "multivitamins",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "ملتي فيتامين (فيتامينات متعددة)",
                  "description": "فيتامينات متعددة لدعم الصحة العامة. تركيبات يومية، تركيبات مخصصة للرجال، النساء، الأطفال، وكبار السن.",
                  "children": []
                },
                {
                  "id": "5f1c40cc-10d2-4e6d-81ce-86b8ff9b0b4d",
                  "slug": "minerals-trace-elements",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "معادن",
                  "description": "مكملات المعادن الأساسية. كالسيوم، مغنيزيوم، حديد، زنك، بوتاسيوم، وغيرها من المعادن الضرورية لصحة الجسم.",
                  "children": []
                },
                {
                  "id": "e6f0aa65-7062-45bc-aecd-5025d57bc7ec",
                  "slug": "herbal-supplements",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "مكملات عشبية",
                  "description": "مكملات من أعشاب طبيعية. جينسينغ، كركم، ثوم، إشنسا، وجينكو بيلوبا لدعم الصحة بطرق طبيعية.",
                  "children": []
                }
              ]
            },
            {
              "id": "2f2ce7a8-365d-466b-8397-85c64271482c",
              "slug": "first-aid-emergency-care",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "إسعافات أولية وطوارئ",
              "description": "خليك جاهز لأي طارئ. شنط إسعافات أولية متكاملة، ضمادات وشاش، معقمات، أدوية طوارئ، ومستلزمات العناية بالجروح.",
              "children": [
                {
                  "id": "a43fa666-9edc-449b-8e26-81b00d6ef88d",
                  "slug": "first-aid-kits",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "شنط إسعافات أولية",
                  "description": "شنط إسعافات أولية مجهزة بالكامل. شنط للمنزل، السيارة، العمل، والرحلات.",
                  "children": []
                },
                {
                  "id": "f254e206-6d9d-4b4c-abc6-c8aa9ac495bd",
                  "slug": "bandages-wound-care",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "شاش وضمادات للجروح",
                  "description": "مستلزمات العناية بالجروح. لزقات جروح، شاش معقم، بلاستر طبي، مناديل معقمة، وضمادات متنوعة.",
                  "children": []
                },
                {
                  "id": "e266a742-ba74-43fe-8307-58770d48b70b",
                  "slug": "emergency-medications",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "أدوية للحالات الطارئة",
                  "description": "أدوية أساسية للحالات الطارئة. مسكنات ألم، مضادات حساسية، كريمات حروق، وأدوية إنقاذ أخرى.",
                  "children": []
                }
              ]
            },
            {
              "id": "8c491fd7-bb98-48f4-827a-2b3fb85fcd86",
              "slug": "mobility-accessibility-aids",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "مساعدات الحركة والتنقل",
              "description": "للمساعدة على الحركة بسهولة وأمان. كراسي متحركة (عجلات)، ووكر (مشاية)، عكازات، عصي طبية، وكل ما يلزم لدعم كبار السن وذوي الاحتياجات الخاصة.",
              "children": [
                {
                  "id": "f727a6b7-e8da-4fdc-9d1d-edf6fa94fb7b",
                  "slug": "wheelchairs",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "كراسي متحركة (عجلات)",
                  "description": "كراسي متحركة (عجلات) يدوية وكهربائية. كراسي للنقل، وكراسي بمواصفات خاصة، بالإضافة للاكسسوارات.",
                  "children": []
                },
                {
                  "id": "f4af2662-5c14-467c-ad13-a39f3825f296",
                  "slug": "walkers-mobility-aids",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "ووكر (مشايات)",
                  "description": "ووكر (مشايات) للمساعدة على المشي. ووكر عادي، ووكر بعجلات (رولاتور)، وإطارات مشي لدعم كبار السن.",
                  "children": []
                },
                {
                  "id": "664e4696-9cc1-4cca-b188-63f9602e9f9b",
                  "slug": "canes-crutches",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "عكازات وعصي طبية",
                  "description": "عكازات وعصي طبية للمساعدة على الحركة. عكازات ساعد (مرفق) وتحت الإبط، وعصي مشي قابلة للتعديل.",
                  "children": []
                }
              ]
            },
            {
              "id": "eb46159d-b12b-43cf-8c00-46215bf4aad6",
              "slug": "wellness-fitness",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "صحة ولياقة",
              "description": "منتجات لتعزيز الصحة الجسدية والنفسية. أدوات لياقة بدنية منزلية، فرشات يوغا، أدوات مساج واسترخاء، وزيوت عطرية.",
              "children": [
                {
                  "id": "632ea78b-797a-4793-9e7b-4c12ecb7e06a",
                  "slug": "protein-sports-nutrition",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "بروتين ومكملات رياضية",
                  "description": "مكملات للرياضيين. بودرة بروتين، أحماض أمينية (أمينو)، كرياتين، ومكملات الطاقة قبل وبعد التمرين.",
                  "children": []
                }
              ]
            },
            {
              "id": "8a919829-4862-4188-9db9-cc05d20f1617",
              "slug": "personal-care-hygiene",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "عناية شخصية ونظافة صحية",
              "description": "منتجات النظافة والعناية الصحية. معقمات، مطهرات، كمامات وكفوف، وكل مستلزمات الحماية والنظافة الشخصية.",
              "children": []
            },
            {
              "id": "646e6102-c21c-46cd-8b11-984ec2b5a0b8",
              "slug": "medical-supplies-consumables",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "مستلزمات ومستهلكات طبية",
              "description": "مستهلكات طبية للعيادات والمنازل. سرنجات، كفوف، كمامات، شاش وقطن، بلاستر طبي، ومستلزمات طبية تستخدم لمرة واحدة.",
              "children": []
            },
            {
              "id": "e9ff19b1-cd18-4569-8504-e654ca845f55",
              "slug": "maternal-baby-health",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "صحة الأم والطفل",
              "description": "منتجات مخصصة لدعم صحة الأم والطفل، بما في ذلك مكملات ما قبل الولادة وما بعدها، مستلزمات الرضاعة، أجهزة مراقبة الأطفال، ومنتجات العناية بالبشرة للرضع.",
              "children": []
            },
            {
              "id": "18e47119-1a62-4447-b678-7477e16ba2a7",
              "slug": "senior-care-support",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "رعاية كبار السن",
              "description": "منتجات لدعم ورعاية كبار السن. منظمات أدوية، مساعدات سمعية وبصرية، ومستلزمات لتسهيل الحياة اليومية.",
              "children": []
            },
            {
              "id": "8e555a9d-2a2a-4822-9d1d-ca8e81654061",
              "slug": "therapeutic-rehabilitation",
              "icon": null,
              "image": null,
              "sort_order": 11,
              "level": 1,
              "name": "علاج طبيعي وتأهيل",
              "description": "أدوات ومعدات متخصصة في العلاج الطبيعي والتأهيل لمساعدة المرضى على استعادة وظائف الجسم وتقليل الألم، تشمل أجهزة تدليك، أربطة دعم، وأدوات تمارين تأهيلية.",
              "children": []
            },
            {
              "id": "15781831-f554-4557-a742-e14d42561c77",
              "slug": "mental-health-therapy",
              "icon": null,
              "image": null,
              "sort_order": 12,
              "level": 1,
              "name": "صحة نفسية واسترخاء",
              "description": "منتجات لدعم الصحة النفسية والاسترخاء. أدوات تخفيف التوتر، مساعدات على التأمل والنوم، ومنتجات لتعزيز الراحة النفسية.",
              "children": []
            },
            {
              "id": "3e985a99-ceca-4779-a83b-aeab78ca7f48",
              "slug": "diagnostic-testing",
              "icon": null,
              "image": null,
              "sort_order": 13,
              "level": 1,
              "name": "فحوصات وتشخيص",
              "description": "معدات وأدوات للتشخيص والفحص. أطقم فحص منزلية (حمل، كورونا)، مستلزمات مخابر، وأدوات تشخيص طبية.",
              "children": []
            },
            {
              "id": "f430108d-da1c-415a-8601-6eb814e8510e",
              "slug": "alternative-natural-health",
              "icon": null,
              "image": null,
              "sort_order": 14,
              "level": 1,
              "name": "صحة طبيعية وبديلة",
              "description": "حلول صحية تعتمد على مكونات طبيعية وأساليب علاج بديلة، مثل المكملات العشبية، العلاج بالروائح، والمنتجات العضوية لدعم العافية.",
              "children": []
            },
            {
              "id": "940a2e69-1f73-4847-9640-01865a12a035",
              "slug": "professional-medical-equipment",
              "icon": null,
              "image": null,
              "sort_order": 15,
              "level": 1,
              "name": "تجهيزات طبية احترافية",
              "description": "تجهيزات طبية احترافية للعيادات والمستشفيات. أدوات جراحية، معدات فحص، أجهزة مراقبة سريرية، ومستلزمات أخرى.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000050",
          "slug": "phones-accessories",
          "icon": null,
          "image": null,
          "sort_order": 10,
          "level": 0,
          "name": "موبايلات واكسسواراتها",
          "description": "اكتشف أحدث الهواتف المحمولة والهواتف الذكية والإكسسوارات. تصفح مجموعة كاملة من الأجهزة، الكفرات، الشواحن، وكل ما تحتاجه لهاتفك.",
          "children": [
            {
              "id": "b0b83721-25ae-49d7-aa5f-acbdd7ac1aa3",
              "slug": "smartphones",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "الهواتف الذكية",
              "description": "كل ماركات الموبايلات الذكية متل آيفون، سامسونغ، هواوي، شاومي، أوبو، فيفو، ون بلس، جوجل بيكسل، وغيرها من الموبايلات الحديثة.",
              "children": [
                {
                  "id": "96c5ecdf-97fd-46d3-aba8-a9bb298a2c35",
                  "slug": "iphone",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "آيفون",
                  "description": "موبايلات آيفون من آبل، متل آيفون 16، آيفون 15، آيفون 14، آيفون 13، آيفون 12، آيفون 11، آيفون SE، وكل موديلات الآيفون.",
                  "children": []
                },
                {
                  "id": "e759a6ee-32c8-4e32-9ba8-c1e30132053b",
                  "slug": "samsung-galaxy",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "سامسونغ جالاكسي",
                  "description": "موبايلات سامسونغ جالاكسي، متل سلسلة جالاكسي S، سلسلة جالاكسي نوت، سلسلة جالاكسي A، وجالاكسي Z فولد وفليب، وكل موديلات سامسونغ.",
                  "children": []
                },
                {
                  "id": "209540d3-3304-4772-9337-05d41e67739b",
                  "slug": "xiaomi",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "شاومي",
                  "description": "موبايلات شاومي، متل سلسلة Mi، سلسلة Redmi، سلسلة POCO، سلسلة Note، وكل موديلات شاومي.",
                  "children": []
                },
                {
                  "id": "111a3af4-b188-4e24-b16f-ac8cd1127414",
                  "slug": "huawei",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "هواوي",
                  "description": "موبايلات هواوي، متل سلسلة P، سلسلة Mate، سلسلة nova، سلسلة Y، وكل موديلات هواوي.",
                  "children": []
                },
                {
                  "id": "22358fce-b809-41a8-8a04-ece63fe33236",
                  "slug": "honor",
                  "icon": null,
                  "image": null,
                  "sort_order": 5,
                  "level": 1,
                  "name": "هونر",
                  "description": "موبايلات هونر متل هونر 90، هونر 70، سلسلة هونر X، وكل موديلات هونر.",
                  "children": []
                },
                {
                  "id": "d28f0cbd-6e34-44d2-b5e8-682e260a036c",
                  "slug": "oppo",
                  "icon": null,
                  "image": null,
                  "sort_order": 6,
                  "level": 1,
                  "name": "أوبو",
                  "description": "موبايلات أوبو متل سلسلة فايند X، سلسلة رينو، سلسلة A، وكل موديلات أوبو.",
                  "children": []
                },
                {
                  "id": "803fb7ad-498d-41bf-a826-54b48618276c",
                  "slug": "vivo",
                  "icon": null,
                  "image": null,
                  "sort_order": 7,
                  "level": 1,
                  "name": "فيفو",
                  "description": "موبايلات فيفو متل سلسلة X، سلسلة V، سلسلة Y، وكل موديلات فيفو.",
                  "children": []
                },
                {
                  "id": "404562fe-8039-461e-8396-55dc437b3471",
                  "slug": "oneplus",
                  "icon": null,
                  "image": null,
                  "sort_order": 8,
                  "level": 1,
                  "name": "ون بلس",
                  "description": "موبايلات ون بلس متل ون بلس 12، ون بلس 11، سلسلة نورد، وكل موديلات ون بلس.",
                  "children": []
                },
                {
                  "id": "2906221f-6616-4b72-b83d-008599fe7495",
                  "slug": "nokia",
                  "icon": null,
                  "image": null,
                  "sort_order": 9,
                  "level": 1,
                  "name": "نوكيا",
                  "description": "موبايلات نوكيا متل سلسلة نوكيا G، سلسلة نوكيا X، سلسلة نوكيا C، وكل موديلات نوكيا.",
                  "children": []
                },
                {
                  "id": "3d767049-7dd2-4b7b-bff7-3625642478d6",
                  "slug": "other-smartphone-brands",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "ماركات موبايلات تانية",
                  "description": "ماركات موبايلات تانية متل آسوس، TCL، Nothing، انفينيكس، تكنو، بلاك فيو، Ulefone، وغيرها من الماركات الجديدة.",
                  "children": []
                }
              ]
            },
            {
              "id": "5d5b4fc2-cfe2-47aa-b71e-a139347ba42f",
              "slug": "phone-cases-covers",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "كفرات وبيوت للموبايل",
              "description": "كفرات وبيوت للموبايلات، سيليكون، جلد، كفرات قاسية، فليب كفر، كفرات محفظة، وأغطية حماية لكل موديلات الموبايلات.",
              "children": []
            },
            {
              "id": "23bb860e-17f6-4c6b-9f04-8d31a601ae07",
              "slug": "chargers-cables",
              "icon": null,
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "شواحن وكابلات",
              "description": "شواحن وكابلات للموبايلات، شواحن Type-C، شواحن آيفون (Lightning)، شواحن Micro USB، شواحن لاسلكية، شواحن سريعة، وكل اكسسوارات الشحن.",
              "children": []
            },
            {
              "id": "62cc99d1-1003-438d-a1a3-abd53c4f3d69",
              "slug": "screen-protectors",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "لزقات حماية للشاشة",
              "description": "لزقات حماية لشاشة الموبايل، لزقات زجاج مقسّى، لزقات بلاستيك، شاشات خصوصية، لزقات ضد الضوء الأزرق، وكل أنواع حمايات الشاشة.",
              "children": []
            },
            {
              "id": "91e14712-e7e7-404a-942e-828a4a064871",
              "slug": "power-banks-portable-chargers",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "باور بانك وشواحن محمولة",
              "description": "باور بانك وشواحن محمولة، بسعات عالية، شحن سريع، شحن لاسلكي، شحن شمسي، وكل حلول الشحن المتنقلة.",
              "children": []
            },
            {
              "id": "fdf08b57-b077-4981-8341-f33fcc2a9aff",
              "slug": "phone-holders-mounts",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "ستاندات وقواعد للموبايل",
              "description": "ستاندات وقواعد للموبايل، قواعد للسيارة، ستاندات مكتب، قواعد للحائط، قواعد للدراجة، ترايبود (حامل ثلاثي)، ومسكات للموبايل.",
              "children": []
            },
            {
              "id": "00685d0f-83e5-4215-96c9-fd949b7b86d8",
              "slug": "memory-cards-storage",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "كروت ذاكرة وتخزين",
              "description": "كروت ذاكرة وحلول تخزين للموبايلات، متل كروت microSD، كروت SD، فلاشات، قارئات كروت (Readers)، وأجهزة تخزين خارجية.",
              "children": []
            },
            {
              "id": "eb02e2ba-02c6-44d4-ad54-8927fbdfd7c4",
              "slug": "phone-parts-components",
              "icon": null,
              "image": null,
              "sort_order": 11,
              "level": 1,
              "name": "قطع غيار للموبايلات",
              "description": "قطع غيار ومكونات للموبايلات، متل بطاريات، شاشات، كاميرات، سبيكرات، مداخل شحن، كبسات، وقطع تبديل لكل موديلات الموبايلات.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000017",
          "slug": "jobs-employment",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752565164096-74620f01-527e-4f1e-91c0-7d2b591dd7cc.webp",
          "image": null,
          "sort_order": 11,
          "level": 0,
          "name": "وظائف وتوظيف",
          "description": "اعثر على فرصتك المهنية التالية في سوريا. تصفح آلاف قوائم الوظائف في مختلف الصناعات وتقدم لوظيفة أحلامك اليوم.",
          "children": [
            {
              "id": "2209dc58-1f0b-45ed-a36f-e0aae203a2ad",
              "slug": "healthcare-medical-jobs",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "وظائف طبية وصحية",
              "description": "فرص عمل في القطاع الطبي والصحي. مطلوب أطباء، ممرضين، صيادلة، فنيي مخبر وأشعة، وإداريين للعمل في مستشفيات وعيادات ومراكز طبية.",
              "children": [
                {
                  "id": "e17a75a7-2a6b-4c36-927c-bdc655a3ff3a",
                  "slug": "doctors-physicians",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "وظائف أطباء",
                  "description": "مطلوب أطباء من كافة الاختصاصات. أطباء عامين، أخصائيين، جراحين، واستشاريين للعمل في مستشفيات وعيادات خاصة.",
                  "children": []
                },
                {
                  "id": "e1409646-de12-42d6-be33-4f763f848c38",
                  "slug": "nursing-jobs",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "وظائف تمريض",
                  "description": "مطلوب ممرضين وممرضات. فرص عمل للممرضين المجازين، مساعدي الممرضين، ورؤساء أقسام التمريض.",
                  "children": []
                },
                {
                  "id": "02417db2-e9c0-4cb7-aea9-f586f60090a6",
                  "slug": "pharmacy-jobs",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "وظائف صيدلة",
                  "description": "مطلوب صيادلة. فرص عمل لصيادلة، فنيي صيدلة، ومندوبي مبيعات أدوية للعمل في الصيدليات ومستودعات الأدوية.",
                  "children": []
                },
                {
                  "id": "e1a8d2f5-117c-40cf-813c-9b28887d38de",
                  "slug": "medical-support-staff",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "وظائف دعم طبي",
                  "description": "مطلوب موظفي دعم طبي. فنيي مخبر، فنيي أشعة، موظفي استقبال في عيادات، وإداريين طبيين.",
                  "children": []
                }
              ]
            },
            {
              "id": "43df7880-41ba-4a45-9148-d1fad6c586d0",
              "slug": "education-training-jobs",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "وظائف تعليم وتدريس",
              "description": "فرص عمل في قطاع التعليم والتدريب. مطلوب مدرسين للمدارس، أساتذة جامعات، مدربين مهنيين، وإداريين للعمل في مؤسسات تعليمية وتدريبية.",
              "children": [
                {
                  "id": "ab5759a5-a086-463d-8d53-6fbebe005eb9",
                  "slug": "school-teachers",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "وظائف تدريس في المدارس",
                  "description": "مطلوب مدرسين ومدرسات للمدارس الخاصة. معلمين لكافة المراحل (ابتدائي، إعدادي، ثانوي) ولكل المواد الدراسية.",
                  "children": []
                },
                {
                  "id": "a5122689-d8cf-464b-809e-17f32855adb8",
                  "slug": "university-faculty",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "وظائف تدريس جامعي",
                  "description": "مطلوب أعضاء هيئة تدريس للجامعات. أساتذة، محاضرين، ومعيدين في مختلف الكليات والتخصصات.",
                  "children": []
                },
                {
                  "id": "a68077aa-b6fb-4cbf-8ce0-2fac97232051",
                  "slug": "training-development",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "وظائف تدريب",
                  "description": "مطلوب مدربين. مدربين في مجالات اللغات، الكمبيوتر، التنمية البشرية، وغيرها من المهارات المهنية.",
                  "children": []
                }
              ]
            },
            {
              "id": "9f771f5e-6d20-48e0-b671-93716ac606ee",
              "slug": "technology-it-jobs",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "وظائف برمجة وتقنية معلومات",
              "description": "فرص عمل في قطاع التكنولوجيا والبرمجة. مطلوب مبرمجين، موظفي دعم فني، مدراء شبكات، خبراء أمن سيبراني، ومتخصصي تسويق رقمي.",
              "children": [
                {
                  "id": "2266dd43-e103-4747-a81e-d3b91745c6bb",
                  "slug": "software-development",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "وظائف تطوير برمجيات",
                  "description": "مطلوب مبرمجين. مطوري ويب (front-end, back-end)، مطوري تطبيقات موبايل (أندرويد و iOS)، ومهندسي برمجيات.",
                  "children": []
                },
                {
                  "id": "60c92983-e9c2-4811-9262-1c03526eba9d",
                  "slug": "it-support-administration",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "وظائف دعم فني وإدارة شبكات",
                  "description": "مطلوب موظفي دعم فني ومدراء شبكات. فنيي مكتب مساعدة (Help Desk)، مدراء أنظمة، ومدراء شبكات.",
                  "children": []
                },
                {
                  "id": "3d0ab0e4-be3b-4842-a32c-c5df438c2230",
                  "slug": "digital-marketing-design",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "وظائف تسويق رقمي وتصميم",
                  "description": "مطلوب موظفين في مجال التسويق الرقمي والتصميم. مسوقين إلكترونيين، مصممي غرافيك، ومسؤولي صفحات تواصل اجتماعي.",
                  "children": []
                }
              ]
            },
            {
              "id": "61e10fe0-23a7-46a5-b9d8-b6e29bf2428b",
              "slug": "business-finance",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "وظائف إدارة وأعمال ومالية",
              "description": "فرص عمل في قطاع الإدارة والمالية. مطلوب محاسبين، مدراء ماليين، مدراء أعمال، موظفي مبيعات، وموظفين في البنوك.",
              "children": [
                {
                  "id": "a81b4598-a7d6-4cb4-85eb-2d71cabef6c5",
                  "slug": "sales-marketing",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "وظائف مبيعات وتسويق",
                  "description": "مطلوب موظفي مبيعات وتسويق. مندوبي مبيعات، مدراء تسويق، مدراء حسابات، وموظفي تطوير أعمال.",
                  "children": []
                },
                {
                  "id": "26d61a02-b80e-4656-80eb-4d083023985d",
                  "slug": "accounting-bookkeeping",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "وظائف محاسبة",
                  "description": "مطلوب محاسبين. محاسبين، مدخلي بيانات محاسبية، رؤساء حسابات، ومدققين ماليين للعمل في الشركات والمكاتب.",
                  "children": []
                },
                {
                  "id": "74168498-be7d-459c-b1e8-d76f0489ffce",
                  "slug": "management-administration",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "وظائف إدارة وسكرتاريا",
                  "description": "مطلوب موظفين إداريين. مدراء، مدراء مكاتب، سكرتاريا، ومساعدين إداريين للعمل في الشركات.",
                  "children": []
                }
              ]
            },
            {
              "id": "5401606d-0733-4faa-a9b0-2ceeea771832",
              "slug": "employment-services",
              "icon": null,
              "image": null,
              "sort_order": 13,
              "level": 1,
              "name": "خدمات التوظيف",
              "description": "خدمات تساعدك لتلاقي شغل. مكاتب توظيف، استشارات مهنية، خدمات كتابة السيرة الذاتية (CV)، والمساعدة في إيجاد فرصة العمل المناسبة.",
              "children": []
            },
            {
              "id": "c24e691e-2023-4e4f-a220-1406d1203f7f",
              "slug": "engineering-construction",
              "icon": null,
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "وظائف هندسة وإنشاءات",
              "description": "فرص عمل في مجال الهندسة والمقاولات. مطلوب مهندسين مدني، معماري، مدراء مشاريع، مشرفي بناء، وعمال في قطاع الإنشاءات.",
              "children": []
            },
            {
              "id": "61da36ea-c63f-4732-8b03-94cab4ade0aa",
              "slug": "manufacturing-production",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "وظائف صناعة وإنتاج",
              "description": "فرص عمل في المصانع والمعامل. مطلوب عمال إنتاج، مشرفين، موظفي ضبط جودة، مشغلي آلات، وفنيين صناعيين.",
              "children": []
            },
            {
              "id": "e0217835-75c6-4ce0-adcd-10fc0e4f880e",
              "slug": "customer-service-support",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "وظائف خدمة زبائن",
              "description": "فرص عمل في مجال خدمة الزبائن. مطلوب موظفي كول سنتر، موظفي دعم فني، وموظفي علاقات عامة للرد على استفسارات الزبائن وحل مشاكلهم.",
              "children": []
            },
            {
              "id": "5305afd9-b774-42eb-9e23-578eb82407d0",
              "slug": "agriculture-food-industry",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "وظائف زراعة وصناعات غذائية",
              "description": "فرص عمل في قطاع الزراعة والصناعات الغذائية. مطلوب مهندسين زراعيين، فنيين، عمال في معامل الأغذية، وموظفي ضبط جودة.",
              "children": []
            },
            {
              "id": "021931c0-df56-4fac-9010-178fe0e4ed20",
              "slug": "transportation-logistics",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "وظائف نقل وسواقة",
              "description": "فرص عمل في قطاع النقل. مطلوب سائقين (شوفيرية)، منسقين لوجستيين، عمال مستودعات، وموظفي توصيل (دليفري).",
              "children": []
            },
            {
              "id": "2739ee96-6767-47f2-86ab-85fd2e4afa65",
              "slug": "hospitality-tourism",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "وظائف مطاعم وفنادق",
              "description": "فرص عمل في قطاع المطاعم والفنادق. مطلوب موظفي استقبال، ويترات، طباخين، عمال نظافة، ومنظمي فعاليات.",
              "children": []
            },
            {
              "id": "5f3469bb-4545-4311-9c05-9ce224616b70",
              "slug": "government-public-sector",
              "icon": null,
              "image": null,
              "sort_order": 11,
              "level": 1,
              "name": "وظائف حكومية وقطاع عام",
              "description": "فرص عمل في الدوائر الحكومية والقطاع العام. إعلانات التوظيف والمسابقات الحكومية في مختلف الوزارات والمؤسسات.",
              "children": []
            },
            {
              "id": "a0deef39-f35d-43b7-9c05-6a0a30f87766",
              "slug": "training-professional-development",
              "icon": null,
              "image": null,
              "sort_order": 14,
              "level": 1,
              "name": "دورات تدريبية وتطوير مهني",
              "description": "طور مهاراتك وزيد فرصك بالشغل. دورات تدريبية، ورشات عمل، شهادات مهنية، وبرامج تطوير مهني في مختلف المجالات.",
              "children": []
            },
            {
              "id": "61fec505-8138-4a84-9b1e-18a264174d13",
              "slug": "business-opportunities",
              "icon": null,
              "image": null,
              "sort_order": 15,
              "level": 1,
              "name": "فرص استثمارية وتجارية",
              "description": "فرص لبدء مشروعك الخاص. فرص شراكة، أفكار مشاريع جديدة، محلات للبيع، وفرص استثمارية في مختلف القطاعات.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000023",
          "slug": "agriculture-farming",
          "icon": null,
          "image": null,
          "sort_order": 12,
          "level": 0,
          "name": "زراعة وفلاحة",
          "description": "اعثر على جميع احتياجاتك الزراعية والفلاحية في مكان واحد. تصفح إعلانات الجرارات والمعدات الزراعية والبذور والأسمدة والمواشي.",
          "children": [
            {
              "id": "bcd55056-aa43-432f-b44c-c65fe46d237f",
              "slug": "agricultural-equipment-machinery",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "معدات وآليات زراعية",
              "description": "كل ما يلزم المزارع من آليات ومعدات حديثة. جرارات (تراكتورات)، حصادات، فلاحات، بذارات، وكل الآليات الزراعية وقطع غيارها.",
              "children": [
                {
                  "id": "c7a1a0f3-e5d7-4c7b-8c6c-8979e2786a3d",
                  "slug": "self-propelled-machinery",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "آليات ذاتية الدفع",
                  "description": null,
                  "children": []
                },
                {
                  "id": "f5b0c703-1977-4ed2-8cfb-32a62c38b306",
                  "slug": "post-harvesting-equipment",
                  "icon": null,
                  "image": null,
                  "sort_order": 0,
                  "level": 2,
                  "name": "معدات ما بعد الحصاد",
                  "description": "معدات لمعالجة المحاصيل بعد الحصاد مثل الفرز والتجفيف والتعبئة.",
                  "children": []
                },
                {
                  "id": "5b898f33-f354-4a18-9f76-3015ea99bf8f",
                  "slug": "planting-seeding-equipment",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "بذّارات وشتّالات",
                  "description": "آلات زراعة البذار والشتول. بذّارات، شتّالات آلية، وآلات زراعة دقيقة لضمان أفضل توزيع.",
                  "children": []
                },
                {
                  "id": "e3a6bbf6-8cbf-4fc0-8935-afe1a2570b27",
                  "slug": "tillage-equipment",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "معدات حراثة وفلاحة",
                  "description": "معدات لتحضير التربة. محاريث (سكك)، فلاحات، ديسكات، وكل ما يلزم لحراثة وفلاحة الأرض.",
                  "children": []
                }
              ]
            },
            {
              "id": "49190e48-aa13-4974-9db7-ad0bd680d445",
              "slug": "seeds-planting-materials",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "بذار وشتول",
              "description": "أفضل أنواع البذار والشتول لتحسين إنتاجك. بذار قمح، شعير، خضروات، وشتول أشجار مثمرة من أفضل المصادر الموثوقة.",
              "children": []
            },
            {
              "id": "20d1c546-21c1-4bb5-9790-179eec815793",
              "slug": "fertilizers-soil-amendments",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "أسمدة ومخصبات زراعية",
              "description": "لزيادة خصوبة التربة وتحسين المحصول. أسمدة كيماوية (آزوت، فوسفات)، أسمدة عضوية، وجميع أنواع المخصبات ومحسنات التربة.",
              "children": []
            },
            {
              "id": "f89b2757-b389-4898-aa58-703271c815fb",
              "slug": "farming-supplies-tools",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "لوازم وأدوات زراعية",
              "description": "جميع لوازم المزرعة والأرض. أدوات يدوية (مجارف، فؤوس)، أدوات كهربائية، مواد تسييج، حلول تخزين، وكل المستلزمات الزراعية.",
              "children": []
            },
            {
              "id": "c4175577-95bd-459c-b704-7e12de468154",
              "slug": "irrigation-systems-equipment",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "شبكات ومعدات ري",
              "description": "حلول الري الحديثة لتوفير المياه وزيادة الإنتاج. شبكات ري بالتنقيط، رشاشات، مضخات (غطاسات)، خراطيم، وخزانات مياه.",
              "children": []
            },
            {
              "id": "d8acc66f-4b20-44ac-8f51-23f0e7d50f18",
              "slug": "crop-protection-pesticides",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "أدوية زراعية ومبيدات",
              "description": "لحماية محصولك من الآفات والأمراض. مبيدات حشرية، مبيدات فطرية، مبيدات أعشاب، ومعدات رش لضمان سلامة المحصول.",
              "children": []
            },
            {
              "id": "61620b07-6d79-402f-aa60-ea350820ad96",
              "slug": "animal-feed-nutrition",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "أعلاف",
              "description": "تغذية متكاملة للمواشي والدواجن. أعلاف للأبقار، الأغنام، والدجاج، بالإضافة إلى المكملات الغذائية والفيتامينات والمعالف.",
              "children": []
            },
            {
              "id": "7b533095-9b82-4bd9-8a07-bbc340452d0b",
              "slug": "greenhouse-nursery-supplies",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "لوازم بيوت بلاستيكية ومشاتل",
              "description": "كل ما يلزم لتجهيز البيوت البلاستيكية (المحمية) والمشاتل. هياكل حديدية، نايلون تغطية، صواني تشتيل، وبيتموس.",
              "children": []
            },
            {
              "id": "f059249c-77b7-423d-8312-9682bc6e288e",
              "slug": "farm-buildings-infrastructure",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "أبنية ومنشآت زراعية",
              "description": "تصميم وتنفيذ المنشآت الزراعية. حظائر للمواشي، مستودعات، هنكارات، وصوامع لتخزين الحبوب.",
              "children": []
            },
            {
              "id": "45c491a9-e914-4323-a9e5-2c9a974294e2",
              "slug": "agricultural-services",
              "icon": null,
              "image": null,
              "sort_order": 11,
              "level": 1,
              "name": "خدمات زراعية",
              "description": "خدمات لدعم المزارعين. استشارات زراعية، تحليل تربة ومياه، خدمات بيطرية، تأجير آليات زراعية، وتدريب زراعي.",
              "children": []
            },
            {
              "id": "ae023982-f13a-4d7e-91cd-271d64b383b6",
              "slug": "organic-sustainable-farming",
              "icon": null,
              "image": null,
              "sort_order": 12,
              "level": 1,
              "name": "زراعة عضوية",
              "description": "مستلزمات الزراعة العضوية (الأورغانيك). أسمدة عضوية، مكافحة حيوية للآفات، وبذار عضوي لإنتاج محاصيل صحية.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000025",
          "slug": "events-celebrations",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752565205073-f290df7a-967e-4067-bcbd-614f8851cad5.webp",
          "image": null,
          "sort_order": 13,
          "level": 0,
          "name": "مناسبات واحتفالات",
          "description": "خطط لمناسبتك المثالية من خلال قائمتنا الشاملة للخدمات والمستلزمات لحفلات الزفاف والحفلات والاحتفالات. اعثر على كل شيء من أماكن وقاعات وطعام إلى الديكورات والترفيه.",
          "children": [
            {
              "id": "9169f21b-a424-4dd2-a45b-778049c8a19d",
              "slug": "wedding-events-services",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "أعراس ومناسبات",
              "description": "كل ما يلزم لتجهيز ليلة العمر. خدمات متكاملة لتنظيم الأعراس والخطوبة، من حجز الصالة وتجهيز العروس، إلى التصوير والضيافة والزفة.",
              "children": [
                {
                  "id": "a339a8de-b35f-44e8-ab93-800f6d336eae",
                  "slug": "wedding-planning-coordination",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "تنظيم وتنسيق أعراس",
                  "description": "منظمين محترفين لترتيب كل تفاصيل عرسك، من حجز المواعيد إلى تنسيق يوم الحفل ليكون يوماً مثالياً.",
                  "children": []
                },
                {
                  "id": "b3707d0e-ce8a-45b1-bc8a-26a411e9c22e",
                  "slug": "bridal-services-beauty",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "تجهيز عروس",
                  "description": "خدمات متكاملة لجمال العروس. مكياج وتسريحة، نقش حنة، باكيجات سبا وعناية بالبشرة قبل العرس.",
                  "children": []
                },
                {
                  "id": "9b712b1f-3faf-4ba1-8999-31fd754ba593",
                  "slug": "wedding-venues-halls",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "صالات أفراح",
                  "description": "أجمل صالات الأفراح والمواقع المفتوحة. صالات فخمة، مزارع، حدائق، وقاعات فنادق لإقامة حفل زفاف أحلامك.",
                  "children": []
                },
                {
                  "id": "6406a1e8-4c04-423c-9b67-18dd86c4c31f",
                  "slug": "wedding-photography-videography",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "تصوير أعراس",
                  "description": "مصورين فوتوغرافي وفيديو محترفين لتوثيق كل لحظة. تصوير يوم العرس، سيشنات خطوبة، وتصوير ما قبل الزفاف.",
                  "children": []
                }
              ]
            },
            {
              "id": "109eb2ad-e377-4568-9757-ef49c3b2e78c",
              "slug": "entertainment-shows",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "ترفيه وعروض فنية",
              "description": "فقرات ترفيهية وعروض فنية لكل المناسبات. دي جي، فرق موسيقية، عراضة شامية، فرق دبكة، سحرة، وفقرات ترفيهية متنوعة.",
              "children": [
                {
                  "id": "6b0de085-216a-4ff3-a094-b6afe63f5e41",
                  "slug": "live-music-bands",
                  "icon": null,
                  "image": null,
                  "sort_order": 1,
                  "level": 2,
                  "name": "فرق موسيقية وغنائية",
                  "description": "فرق موسيقية لإحياء الحفلات. فرق شرقية وغربية، فرق دبكة، عراضة شامية، ومطربين لإضفاء جو من البهجة.",
                  "children": []
                },
                {
                  "id": "08ccdac0-ba41-45d8-93bc-38dd07d0442a",
                  "slug": "dj-sound-services",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "دي جي (DJ) وأجهزة صوت",
                  "description": "خدمات دي جي محترفين مع أحدث الأغاني. تأجير أجهزة صوت وإضاءة متكاملة لجميع أنواع الحفلات.",
                  "children": []
                },
                {
                  "id": "a454c11e-a2db-4d73-9f25-cc7d1c586284",
                  "slug": "dancers-performers",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "فرق استعراضية وراقصة",
                  "description": "فرق استعراضية لإضافة لمسة مميزة. فرق دبكة، عراضة شامية، راقصات، وعروض فلكلورية وتراثية.",
                  "children": []
                },
                {
                  "id": "a84bae04-b9e2-443c-abed-0dbcf2da94dd",
                  "slug": "comedy-entertainment-acts",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "فقرات كوميدية وترفيهية",
                  "description": "فقرات ترفيهية ممتعة. عروض سحر، فقرات كوميدية، مهرجين للأطفال، ورواة قصص لإضفاء جو من المرح.",
                  "children": []
                }
              ]
            },
            {
              "id": "426169c9-cdf5-4398-911d-eb68c7919040",
              "slug": "venue-rentals-locations",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "حجز صالات ومواقع للمناسبات",
              "description": "قاعات وصالات متنوعة للمناسبات. صالات أفراح، قاعات مؤتمرات، وأماكن خاصة.",
              "children": [
                {
                  "id": "5fa8e739-9409-4bbc-8df7-e6bec7157404",
                  "slug": "conference-centers-meeting-rooms",
                  "icon": null,
                  "image": null,
                  "sort_order": 2,
                  "level": 2,
                  "name": "قاعات مؤتمرات واجتماعات",
                  "description": "قاعات مجهزة للمؤتمرات والاجتماعات. قاعات في فنادق ومراكز أعمال مجهزة بأحدث التقنيات السمعية والبصرية.",
                  "children": []
                },
                {
                  "id": "2003ac85-de95-4693-9fa9-3428d020af27",
                  "slug": "outdoor-event-spaces",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "مزارع وأماكن مفتوحة",
                  "description": "أجمل الأماكن المفتوحة للمناسبات. مزارع مع مسابح، حدائق، وأسطح (روف توب) لإقامة حفلات في الهواء الطلق.",
                  "children": []
                },
                {
                  "id": "21d77082-78c6-4238-8955-48e2159422ac",
                  "slug": "private-party-venues",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "صالات وقاعات خاصة",
                  "description": "أماكن وقاعات خاصة للحفلات العائلية والخاصة. صالات صغيرة، فيلات، وأماكن حصرية للاحتفالات الخاصة.",
                  "children": []
                }
              ]
            },
            {
              "id": "2073d6d5-a3f1-4cca-a3cd-2b8c532afc30",
              "slug": "birthday-parties-celebrations",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "حفلات أعياد ميلاد",
              "description": "تنظيم حفلات أعياد ميلاد مميزة للكبار والصغار. خدمات شاملة من الزينة والبالونات، إلى قوالب الكيك، الدي جي، وفقرات الترفيه.",
              "children": []
            },
            {
              "id": "e04d16a8-e999-45d3-bf2f-a930c2b2e06b",
              "slug": "corporate-events-conferences",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "مؤتمرات وفعاليات شركات",
              "description": "خدمات تنظيم فعاليات الشركات. تجهيز مؤتمرات، ندوات، ورشات عمل، حفلات إطلاق منتجات، واحتفالات سنوية للشركات.",
              "children": []
            },
            {
              "id": "da2f8974-00ec-42ee-9a72-077a960ae80e",
              "slug": "religious-cultural-events",
              "icon": null,
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "مناسبات دينية وثقافية",
              "description": "خدمات تجهيز المناسبات الدينية والثقافية. تنظيم احتفالات المولد النبوي، أعياد الميلاد ورأس السنة، والمهرجانات التراثية.",
              "children": []
            },
            {
              "id": "5dce4a44-6c51-43d1-8e0b-89afb84ff169",
              "slug": "event-planning-services",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "خدمات تنظيم مناسبات",
              "description": "شركات ومكاتب لتنظيم جميع أنواع الحفلات والمناسبات. تخطيط وتنسيق متكامل من الألف إلى الياء لمناسبة لا تُنسى.",
              "children": []
            },
            {
              "id": "0776368a-6f7e-4199-aee2-51f76ca621bc",
              "slug": "catering-food-services",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "ضيافة وبوفيهات",
              "description": "خدمات ضيافة وبوفيهات مفتوحة لكل المناسبات. بوفيهات أعراس، حفلات، ومؤتمرات بأشهى المأكولات الشرقية والغربية.",
              "children": []
            },
            {
              "id": "b7ef4a42-2011-419a-b095-b0dee1c3e23d",
              "slug": "photography-videography",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "تصوير فوتوغرافي وفيديو",
              "description": "مصورين محترفين لتوثيق أجمل لحظاتكم. تصوير فوتوغرافي وفيديو للأعراس، الخطوبة، وكل المناسبات الخاصة.",
              "children": []
            },
            {
              "id": "237baa31-c1a3-41db-872a-6c6e2a982083",
              "slug": "music-dj-services",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "دي جي وفرق موسيقية",
              "description": "خدمات موسيقية لإحياء حفلاتكم. دي جي، فرق غنائية، عراضة شامية، وتأجير أجهزة صوت وإضاءة.",
              "children": []
            },
            {
              "id": "adb5a2b2-9a91-4837-b949-f59be02dcdd7",
              "slug": "decorations-party-supplies",
              "icon": null,
              "image": null,
              "sort_order": 11,
              "level": 1,
              "name": "زينة وتجهيزات حفلات",
              "description": "كل ما يلزم لتزيين حفلاتكم. تنسيق ورد طبيعي وصناعي، ديكورات بالونات، إضاءة، وتجهيز طاولات وكراسي.",
              "children": []
            },
            {
              "id": "74d525d1-6b11-4913-b273-6740ec51e1ae",
              "slug": "event-transportation-logistics",
              "icon": null,
              "image": null,
              "sort_order": 12,
              "level": 1,
              "name": "سيارات للمناسبات ونقل",
              "description": "خدمات نقل للمناسبات. تأجير سيارات زفة فخمة، باصات لنقل المدعوين، وخدمات لوجستية لنقل تجهيزات الحفل.",
              "children": []
            },
            {
              "id": "952badeb-6622-4635-81f6-b61f0ed42567",
              "slug": "special-occasions-holidays",
              "icon": null,
              "image": null,
              "sort_order": 13,
              "level": 1,
              "name": "مناسبات خاصة وأعياد",
              "description": "تنظيم جميع المناسبات الخاصة. حفلات خطوبة، تخرج، ذكرى زواج، واحتفالات الأعياد والمواسم.",
              "children": []
            },
            {
              "id": "ae9771d3-70f4-48d8-abc0-19bc0ced7a16",
              "slug": "childrens-events-parties",
              "icon": null,
              "image": null,
              "sort_order": 14,
              "level": 1,
              "name": "حفلات أطفال",
              "description": "تنظيم حفلات للأطفال. حفلات أعياد ميلاد، فعاليات ترفيهية وتعليمية، وفقرات متنوعة (ساحر، مهرج، شخصيات كرتونية).",
              "children": []
            },
            {
              "id": "eda8d32b-118a-4fe6-8dd9-b1446d75f83d",
              "slug": "graduation-academic-events",
              "icon": null,
              "image": null,
              "sort_order": 15,
              "level": 1,
              "name": "حفلات تخرج",
              "description": "خدمات تنظيم حفلات التخرج. تجهيز حفلات تخرج للمدارس والجامعات، وتنسيق الفعاليات الأكاديمية.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000005",
          "slug": "home-appliances",
          "icon": "https://kasioon.s3.us-east-005.backblazeb2.com/0e56dbe4-1bb9-416c-8c0c-b1bccad7c2d4/categoriesIcon/1752565222430-5bca2220-e68c-4461-8a13-d9c03948fa66.webp",
          "image": null,
          "sort_order": 14,
          "level": 0,
          "name": "أجهزة منزلية",
          "description": "جهز مطبخك ومنزلك بمجموعة واسعة من الأجهزة المنزلية الأساسية. اعثر على كل شيء من البرادات والأفران والميكروويف إلى الغسالات والمكانس الكهربائية والمكيفات.",
          "children": [
            {
              "id": "0e8e91eb-13c7-47a6-b655-44576ece7630",
              "slug": "kitchen-appliances",
              "icon": null,
              "image": null,
              "sort_order": 1,
              "level": 1,
              "name": "أجهزة المطبخ",
              "description": "تشكيلة واسعة من أجهزة المطبخ من برادات، أفران، مايكرويف، غسالات صحون، خلاطات، صانعات قهوة، وكل ما يلزم للطبخ وتحضير الطعام.",
              "children": [
                {
                  "id": "3a7fb320-b367-437f-85a9-82fffb29d4a2",
                  "slug": "refrigerators-freezers",
                  "icon": null,
                  "image": null,
                  "sort_order": 13,
                  "level": 2,
                  "name": "البرادات والفريزرات",
                  "description": "حافظ على أكلك طازج مع تشكيلتنا من البرادات والفريزرات، متوفرة بكل الأحجام لتناسب مطبخك.",
                  "children": []
                },
                {
                  "id": "aa0b7a4f-3572-4098-8e1f-5cc5a2ba67b0",
                  "slug": "cooking-appliances",
                  "icon": null,
                  "image": null,
                  "sort_order": 14,
                  "level": 1,
                  "name": "أجهزة الطبخ",
                  "description": "كل شي بيلزمك للطبخ، من غازات كهربا وغاز لأفران وشوايات لتحضير أطيب الأكلات كل مرة.",
                  "children": []
                }
              ]
            },
            {
              "id": "cd018d07-312b-4518-a449-e23501665448",
              "slug": "air-conditioning-cooling",
              "icon": null,
              "image": null,
              "sort_order": 3,
              "level": 1,
              "name": "التكييف والتبريد",
              "description": "خليك بردان مع تشكيلتنا من المكيفات، من وحدات سبليت، مكيفات شباك، ومكيفات محمولة، بالإضافة لمجموعة متنوعة من المراوح.",
              "children": [
                {
                  "id": "4d2ec651-41aa-40b4-afc7-da1bd6e1681a",
                  "slug": "fans-ventilation",
                  "icon": null,
                  "image": null,
                  "sort_order": 3,
                  "level": 2,
                  "name": "مراوح وتهوية",
                  "description": "خليك مرتاح مع تشكيلتنا الواسعة من المراوح، من مراوح سقف، طاولات، وعمودية، بالإضافة لحلول التهوية لهوا نقي.",
                  "children": []
                },
                {
                  "id": "940584da-c0cb-49de-94fc-1d3b60ed3e64",
                  "slug": "air-coolers-evaporative-coolers",
                  "icon": null,
                  "image": null,
                  "sort_order": 4,
                  "level": 2,
                  "name": "مبردات هوا",
                  "description": "طريقة اقتصادية لتبريد مساحتك. مبردات الهوا بتعطي نسمة منعشة باستخدام تبخير المي.",
                  "children": []
                },
                {
                  "id": "b3e3d276-3a0a-440d-999e-dae639fc86b4",
                  "slug": "air-conditioners",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "مكيفات هواء",
                  "description": "أنواع متنوعة من مكيفات الهواء لتبريد المساحات.",
                  "children": []
                }
              ]
            },
            {
              "id": "66ddf92b-cd10-431b-be30-952d995d3be3",
              "slug": "cleaning-appliances",
              "icon": null,
              "image": null,
              "sort_order": 5,
              "level": 1,
              "name": "أجهزة التنظيف",
              "description": "خلي بيتك عم يلمع مع مجموعتنا من مكانس الكهربا، منظفات البخار، وكل شي بيلزمك لتنظيف كل زاوية بالبيت.",
              "children": [
                {
                  "id": "509d7675-6da1-4ebe-bd89-42c48e00fc65",
                  "slug": "vacuum-cleaners",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "مكانس كهربائية",
                  "description": "مكانس كهربائية تقليدية وحديثة لمختلف الأسطح.",
                  "children": []
                },
                {
                  "id": "50d18d95-6d5e-418c-bf20-4119fed87f13",
                  "slug": "steam-cleaners",
                  "icon": null,
                  "image": null,
                  "sort_order": 20,
                  "level": 2,
                  "name": "منظفات بخار",
                  "description": "منظفات بخارية للتنظيف العميق والصحي.",
                  "children": []
                },
                {
                  "id": "aedaf704-7880-4b4f-8256-10755bc7d395",
                  "slug": "robot-vacuums",
                  "icon": null,
                  "image": null,
                  "sort_order": 30,
                  "level": 2,
                  "name": "مكانس روبوت",
                  "description": "مكانس روبوت آلية لتنظيف المنزل الذكي.",
                  "children": []
                }
              ]
            },
            {
              "id": "f7416051-522b-46e4-84a7-449ab5b2cfc6",
              "slug": "personal-care-appliances",
              "icon": null,
              "image": null,
              "sort_order": 6,
              "level": 1,
              "name": "أجهزة العناية الشخصية",
              "description": "اهتم بحالك مع أجهزة العناية الشخصية، من سشوارات، ماكينات حلاقة، ليس، وكل شي بيلزمك لروتينك اليومي.",
              "children": [
                {
                  "id": "2a07e21a-425d-4148-b848-a34019ff1374",
                  "slug": "hair-care-appliances",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "مجففات ومصففات الشعر",
                  "description": "سشوارات، مكواة شعر، وأدوات تصفيف أخرى.",
                  "children": []
                },
                {
                  "id": "43efa434-a044-4168-bb4d-ff742631a57b",
                  "slug": "shavers",
                  "icon": null,
                  "image": null,
                  "sort_order": 20,
                  "level": 2,
                  "name": "ماكينات حلاقة",
                  "description": "ماكينات حلاقة كهربائية للرجال والنساء.",
                  "children": []
                }
              ]
            },
            {
              "id": "e825d1da-9ec8-40eb-adf7-4c8f31699784",
              "slug": "water-heaters-systems",
              "icon": null,
              "image": null,
              "sort_order": 7,
              "level": 1,
              "name": "سخانات المي",
              "description": "مي سخنة على طول مع تشكيلتنا من السخانات، كهربا، غاز، وشمسي، كل شي بيلزمك بتلاقيه عنا.",
              "children": [
                {
                  "id": "57e7dbd6-24d1-47ab-abab-5cad45150f01",
                  "slug": "electric-water-heaters",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "سخانات مياه كهربائية",
                  "description": "سخانات مياه تعمل بالكهرباء بسعات مختلفة.",
                  "children": []
                },
                {
                  "id": "146ae8f3-dd65-44f9-b5ca-277f173222fa",
                  "slug": "gas-water-heaters",
                  "icon": null,
                  "image": null,
                  "sort_order": 20,
                  "level": 2,
                  "name": "سخانات مياه غاز",
                  "description": "سخانات مياه تعمل بالغاز لتوفير الماء الساخن المستمر.",
                  "children": []
                },
                {
                  "id": "0baece2e-2025-4bf9-b409-7feeed1322d7",
                  "slug": "solar-water-heaters",
                  "icon": null,
                  "image": null,
                  "sort_order": 30,
                  "level": 2,
                  "name": "سخانات مياه شمسية",
                  "description": "سخانات مياه شمسية لتسخين المياه بكفاءة طاقة عالية.",
                  "children": []
                },
                {
                  "id": "4b5bcbde-e218-4b2c-9da0-c943c78187e7",
                  "slug": "instant-water-heaters",
                  "icon": null,
                  "image": null,
                  "sort_order": 40,
                  "level": 2,
                  "name": "سخانات مياه فورية",
                  "description": "سخانات مياه فورية لتوفير الماء الساخن عند الطلب.",
                  "children": []
                }
              ]
            },
            {
              "id": "6e14d05c-0914-40aa-b3ed-b73e96dff392",
              "slug": "power-electrical-equipment",
              "icon": null,
              "image": null,
              "sort_order": 10,
              "level": 1,
              "name": "كهربائيات وطاقة",
              "description": "كل شي بيلزمك للكهربا، من مولدات، يو بي إس، منظمات كهربا، وباور بانك لتبقى على طول متصل.",
              "children": [
                {
                  "id": "613fe6f6-781f-485b-a69f-f4828955019c",
                  "slug": "power-generators",
                  "icon": null,
                  "image": null,
                  "sort_order": 10,
                  "level": 2,
                  "name": "مولدات كهربائية",
                  "description": "مولدات كهربائية للاستخدام المنزلي والتجاري.",
                  "children": []
                },
                {
                  "id": "c38b2c93-839b-4d31-b140-bf9ec7fb471b",
                  "slug": "ups-devices",
                  "icon": null,
                  "image": null,
                  "sort_order": 20,
                  "level": 2,
                  "name": "أجهزة يو بي إس",
                  "description": "أجهزة حماية الطاقة غير المنقطعة لحماية الأجهزة الإلكترونية.",
                  "children": []
                },
                {
                  "id": "23b68f65-3f51-43fa-9817-9f505736b40a",
                  "slug": "power-banks",
                  "icon": null,
                  "image": null,
                  "sort_order": 40,
                  "level": 2,
                  "name": "باور بانك",
                  "description": "باور بانك محمول لشحن الأجهزة المحمولة.",
                  "children": []
                }
              ]
            },
            {
              "id": "6e4b1afd-0f9c-429d-8a17-2c13b969c088",
              "slug": "laundry-appliances",
              "icon": null,
              "image": null,
              "sort_order": 2,
              "level": 1,
              "name": "الغسالات والنشافات",
              "description": "كل ما يلزم غسيلك من غسالات أوتوماتيك، نشافات، غسالات مع نشافة، ومكاوي لتلبية كل احتياجاتك.",
              "children": []
            },
            {
              "id": "c7359376-a60a-4357-8971-c02b3ec3ba6e",
              "slug": "heating-appliances",
              "icon": null,
              "image": null,
              "sort_order": 4,
              "level": 1,
              "name": "أجهزة التدفئة",
              "description": "حلول تدفئة متنوعة لبيتك، بتلاقي عنا صوبات كهربا، صوبات غاز، وشوفاجات زيت لتدفي بيتك بالشتا.",
              "children": []
            },
            {
              "id": "1b71aab9-a8c0-42e9-9dbc-abeaa0c5f9a8",
              "slug": "home-entertainment-electronics",
              "icon": null,
              "image": null,
              "sort_order": 8,
              "level": 1,
              "name": "إلكترونيات الترفيه المنزلي",
              "description": "عيش تجربة ترفيه غير شكل مع تشكيلتنا من الشاشات، أنظمة الصوت، والسينما المنزلية.",
              "children": []
            },
            {
              "id": "fc25dd9e-95e3-4503-a6a0-4ab9d7489808",
              "slug": "smart-home-devices",
              "icon": null,
              "image": null,
              "sort_order": 9,
              "level": 1,
              "name": "أجهزة البيت الذكي",
              "description": "خلي بيتك أذكى مع أجهزتنا الذكية، من إضاءة ذكية، كاميرات مراقبة، ومساعدات صوتية لتريح بالك.",
              "children": []
            },
            {
              "id": "ee03bda4-2776-439d-ab91-13a9a61d3f6b",
              "slug": "appliance-parts-accessories",
              "icon": null,
              "image": null,
              "sort_order": 12,
              "level": 1,
              "name": "قطع غيار واكسسوارات",
              "description": "كل قطع الغيار والإكسسوارات اللي بتحتاجها لأجهزتك المنزلية، من فلاتر وريموتات لقطع تبديل لكل شي.",
              "children": []
            }
          ]
        },
        {
          "id": "00000000-0000-0000-0000-000000000008",
          "slug": "livestock-poultry",
          "icon": null,
          "image": null,
          "sort_order": 15,
          "level": 0,
          "name": "مواشي ودواجن",
          "description": "بيع وشراء المواشي والدواجن. أبقار، أغنام، ماعز، دجاج (فروج)، وكل مستلزمات مزارع التربية.",
          "children": [
            {
              "id": "f9534f2c-3e8f-4029-bccc-6fee89917815",
              "slug": "cattle-dairy",
              "icon": null,
              "image": null,
              "sort_order": 0,
              "level": 1,
              "name": "أبقار",
              "description": "بيع وشراء أبقار. أبقار حلوب، عجول تسمين، ثيران، وكل ما يخص تربية الأبقار.",
              "children": []
            },
            {
              "id": "6b14a164-9254-426c-b15b-c59091b31010",
              "slug": "sheep-goats",
              "icon": null,
              "image": null,
              "sort_order": 0,
              "level": 1,
              "name": "أغنام وماعز",
              "description": "بيع وشراء أغنام وماعز. كباش، نعاج، ماعز شامي، وكل أنواع الغنم والماعز.",
              "children": []
            },
            {
              "id": "9372e632-fe46-4930-86ab-f86028d8603a",
              "slug": "horses-equine",
              "icon": null,
              "image": null,
              "sort_order": 0,
              "level": 1,
              "name": "خيول",
              "description": "بيع وشراء خيول عربية أصيلة وغيرها. خيول للركوب، خيول للتربية، وكل مستلزمات الخيل.",
              "children": []
            },
            {
              "id": "c0dc90da-83c2-4a09-8f5e-680fa8066c74",
              "slug": "poultry-birds",
              "icon": null,
              "image": null,
              "sort_order": 0,
              "level": 1,
              "name": "دواجن (فروج)",
              "description": "بيع وشراء دواجن. دجاج لاحم (فروج)، دجاج بياض، صيصان، وكل مستلزمات مزارع الدواجن.",
              "children": []
            }
          ]
        }
      ]
    }
  };

// Existing keywords to preserve
const existingKeywords = {
  // Real Estate - LEAF categories (not "real-estate")
  'houses': ['بيت', 'بيوت', 'منزل', 'منازل', 'دار', 'house', 'houses', 'home', 'homes'],
  'apartments': ['شقة', 'شقق', 'apartment', 'apartments', 'flat', 'flats'],
  'villas': ['فيلا', 'فيلات', 'villa', 'villas'],
  'lands': ['أرض', 'ارض', 'أراضي', 'اراضي', 'land', 'lands', 'plot'],
  'agricultural-lands': ['أرض زراعية', 'ارض زراعية', 'زراعي', 'زراعية', 'agricultural'],
  'commercial-lands': ['أرض تجارية', 'ارض تجارية', 'تجاري', 'تجارية'],
  'offices': ['مكتب', 'مكاتب', 'office', 'offices'],
  'shops': ['محل', 'محلات', 'دكان', 'دكاكين', 'shop', 'shops', 'store', 'stores'],
  'warehouses': ['مستودع', 'مستودعات', 'مخزن', 'مخازن', 'warehouse', 'warehouses'],

  // Vehicles - LEAF categories (not "vehicles")
  'cars': ['سيارة', 'سيارات', 'car', 'cars', 'automobile'],
  'motorcycles': ['دراجة نارية', 'دراجات نارية', 'موتور', 'موتوسيكل', 'motorcycle', 'motorcycles', 'motorbike'],
  'trucks': ['شاحنة', 'شاحنات', 'تريلا', 'truck', 'trucks', 'lorry'],
  'buses': ['باص', 'باصات', 'حافلة', 'حافلات', 'bus', 'buses'],

  // Electronics
  'mobiles': ['موبايل', 'موبايلات', 'جوال', 'هاتف', 'mobile', 'phone', 'smartphone'],
  'laptops': ['لابتوب', 'لابتوبات', 'حاسوب محمول', 'laptop', 'laptops', 'notebook'],
  'tablets': ['تابلت', 'آيباد', 'tablet', 'ipad'],
  'computers': ['كمبيوتر', 'حاسوب', 'computer', 'desktop', 'pc'],

  // Furniture
  'furniture': ['أثاث', 'اثاث', 'موبيليا', 'furniture']
};

/**
 * Recursively find all leaf categories (categories with no children)
 */
function findLeafCategories(categories, result = []) {
  for (const category of categories) {
    if (!category.children || category.children.length === 0) {
      // This is a leaf category
      result.push({
        slug: category.slug,
        name: category.name,
        level: category.level
      });
    } else {
      // Recursively check children
      findLeafCategories(category.children, result);
    }
  }
  return result;
}

/**
 * Generate keywords for a category based on its name
 * This is a basic implementation - user will add more keywords later
 */
function generateBasicKeywords(category) {
  const keywords = [];
  
  // Add the Arabic name
  if (category.name) {
    keywords.push(category.name);
  }
  
  // Add the slug
  keywords.push(category.slug);
  
  return keywords;
}

/**
 * Main function to generate the keywords file
 */
function generateKeywordsFile() {
  console.log('🔄 Generating category keywords file...');
  
  // Find all leaf categories
  const leafCategories = findLeafCategories(categoryData.data.categories);
  console.log(`✅ Found ${leafCategories.length} leaf categories`);
  
  // Build the keywords object
  const keywords = { ...existingKeywords };
  
  // Add new leaf categories that don't exist in existingKeywords
  for (const category of leafCategories) {
    if (!keywords[category.slug]) {
      // Generate basic keywords (user will add more later)
      keywords[category.slug] = generateBasicKeywords(category);
      console.log(`  ➕ Added new category: ${category.slug} with basic keywords`);
    } else {
      console.log(`  ✓ Preserved existing category: ${category.slug}`);
    }
  }
  
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '..', 'src', 'services', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to file
  const outputPath = path.join(outputDir, 'categoryKeywords.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(keywords, null, 2),
    'utf8'
  );
  
  console.log(`✅ Category keywords file created: ${outputPath}`);
  console.log(`📊 Total categories: ${Object.keys(keywords).length}`);
  
  return outputPath;
}

// Run the script
if (require.main === module) {
  try {
    const outputPath = generateKeywordsFile();
    console.log('\n✨ Script completed successfully!');
    console.log(`📁 Output file: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating keywords file:', error);
    process.exit(1);
  }
}

module.exports = { generateKeywordsFile, findLeafCategories };

