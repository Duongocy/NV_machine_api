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
    connectionString: 'postgresql://neondb_owner:npg_luO5CnbW8Hpf@ep-lucky-dawn-a48h270t-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
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
    let topic = req.query.topic;
    console.log("Vừa nhận được yêu cầu từ client");//báo trên log là đã nhận được 1 yêu cầu từ client
    console.log("Kiểu yêu cầu : ", kieu_yeu_cau);
    console.log("Topic : ",topic);
    if (kieu_yeu_cau === 'lessonlist') {
        try {
            query_string = `SELECT user_id,lesson_id,lesson_title,lesson_no,submit_date FROM speaking_lessons WHERE lesson_title LIKE '%${topic}%' ORDER BY lesson_title;`
            console.log("Câu truy vấn : ", query_string);
            const result = await pool.query(query_string);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Lỗi khi lấy dữ liệu nha nha');
        }
    }   
});
app.post('/defectposition', async (req, res) => {
    const { yeucau } = req.query;

    if (yeucau === 'savedefectposition') {
        const arr = req.body; // ví dụ: [true, false, ...]
        console.log("Đã nhận được mảng:", arr);

        try {
            // kiểm tra đủ 32 phần tử chưa
            if (!Array.isArray(arr) || arr.length !== 32) {
                return res.status(400).send("Dữ liệu không hợp lệ — cần 32 giá trị boolean");
            }

            const query = `
                INSERT INTO defectposition (
                    pos01,pos02,pos03,pos04,pos05,pos06,pos07,pos08,
                    pos09,pos10,pos11,pos12,pos13,pos14,pos15,pos16,
                    pos17,pos18,pos19,pos20,pos21,pos22,pos23,pos24,
                    pos25,pos26,pos27,pos28,pos29,pos30,pos31,pos32
                )
                VALUES (
                    ${Array.from({ length: 32 }, (_, i) => `$${i + 1}`).join(', ')}
                ) RETURNING *;
            `;

            const result = await pool.query(query, arr);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).send("Lỗi khi thêm dữ liệu");
        }
    }
});

app.get('/ping', (req, res) => {
    res.send('pong!');
    console.log('Vừa nhận tín hiệu Ping từ cron-job!');
});

// Khởi động server
const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});