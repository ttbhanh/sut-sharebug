# SUT Sharebug

## Huong dan cai dat va trien khai

### Cat dat moi truong

- Nodejs: https://nodejs.org/en/download/package-manager
- MongoDB: https://www.mongodb.com/products/self-managed/community-edition
- Compass. The GUI for MongoDB: https://www.mongodb.com/products/tools/compass

### Cau hinh ket noi CSDL va tao du lieu mau

- Giai nen thu muc project
- Cau hinh Connection String vao file **.env**:
  MONGODB_CONNECTION_STRING="Connection string cua ban"
  (mac dinh, connection string den csdl mongodb cai tren may la "mongodb://127.0.0.1:27017/sharebug", trong do sharebug la ten database)
- Trong thu muc project, cai dat node_modules
  `$ npm install`
- Tao co so du lieu mau (luu y: buoc nay chi chay 1 lan duy nhat)
  `$ npm run db:create`

### Khoi dong web server

`$ npm start`

Duyet web tren duong dan: http://localhost:4000

Mot so tai khoan duoc tao san trong CSDL:

- Admin: admin1@mail.com (Jane Smith), admin2@mail.com (William Davis)
- Manager: manager (Michael Johnson)
- Tester: tester@mail.com (Emily Brown)
- Developer: developer@mail.com (John Doe)
  Mat khau mac dinh cua tat ca cac tai khoan: 123456

### Luu y

- Xem danh sach cac chuc nang da duoc cai dat trong file _Test Management System Functions.md_
- SV chi test cac chuc nang da duoc cai dat, duoc danh dau [x]
