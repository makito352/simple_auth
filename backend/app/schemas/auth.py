from pydantic import BaseModel, EmailStr, Field


class StartAuthRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="認証を開始するユーザーのメールアドレス",
    )


class VerifyOTPRequest(BaseModel):
    code: str = Field(
        ...,
        description="ユーザーが入力したOTPコード（例: 123456）",
    )


class LoginOptionsRequest(BaseModel):
    email: EmailStr = Field(
        ...,
        description="ログインするユーザーのメールアドレス",
    )
