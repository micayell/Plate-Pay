function logout() {
    fetch("/api/v1/tokens/logout", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "include" // 쿠키 같이 보내기
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("로그아웃 실패");
            }
        })
        .catch(error => {
            console.error("로그아웃 요청 에러:", error);
        })
        .finally(() => {
            // 모든 쿠키 삭제
            document.cookie.split(";").forEach(function(c) {
                document.cookie =
                    c.trim().split("=")[0] +
                    "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
            });

            alert("로그아웃 되었습니다.");
            window.location.href = "/auths/login"; // 로그인 페이지로 이동
        });
}
