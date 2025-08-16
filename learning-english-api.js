const express = require('express');
const cors = require('cors'); // Import thư viện cors
const { Pool } = require('pg');
const create_token = require('jsonwebtoken');//khai báo thư viện jkt để tạo token cho mỗi lần đăng nhập
const cron = require('node-cron');

const app = express();
app.use(cors()); // Sử dụng middleware CORS
app.use(express.json());

// Cấu hình kết nối đến PostgreSQL
const pool = new Pool({
    //kết nối với máy local
    // user: 'postgres', // Thay thế bằng username của bạn
    // host: '123.19.121.187',//địa chỉ ip công khai của máy fujitsu 
    // database: 'Invoice',
    // password: '1!Ngaycuoicung', // Thay thế bằng password của bạn
    // port: 5432

    //kết với với database trên neon :
    connectionString: 'postgresql://neondb_owner:npg_JaT6NU0domwy@ep-square-bread-a1bwxa5q-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: {
        rejectUnauthorized: false // Neon dùng SSL
    }
});

app.get('/Invoice', async (req, res) => {
    // const authHeader = req.headers['authorization'];
    // const token = authHeader?.split(' ')[1];

    // if (!token) return res.sendStatus(401); //nếu không có token thì thoát luôn không thực hiện đoạn sau 
    // tokenlib.verify(token, 'DuoNgocY', (err, user) => {//xác thực token
    //     if (err) return res.sendStatus(403); //nếu token bị lỗi hoặc hết hạn cũng thoát luôn không thực hiện đoạn dưới

    // });
    //thực hiện công việc cần khi đã xác thực token ok 
    let kieu_yeu_cau = req.query.yeucau;//Lấy giá trị thuột tính type của request từ client gán cho biến type
    console.log("Vừa nhận được yêu cầu từ client");//báo trên log là đã nhận được 1 yêu cầu từ client
    console.log("Kiểu yêu cầu : ", kieu_yeu_cau);
    if (kieu_yeu_cau === 'lessonlist') {
        try {
            query_string = "SELECT user_id,lesson_id,lesson_title,lesson_no,submit_date FROM speaking_lessons ORDER BY lesson_no;"
            console.log("Câu truy vấn : ", query_string);
            const result = await pool.query(query_string);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi lấy dữ liệu nha nha');
        }
    }    
});

// Khởi động server
const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});