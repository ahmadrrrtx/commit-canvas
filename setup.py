from setuptools import setup, find_packages

setup(
    name="commit-canvas",
    version="1.0.0",
    description="Turn your git history into a beautiful animated story page",
    long_description=open("README.md", "r", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="Muhammad Ahmad (RRRTX)",
    author_email="ahmadrrrtx@gmail.com",
    url="https://github.com/ahmadrrrtx/commit-canvas",
    packages=["cc"],
    include_package_data=True,
    package_data={"cc": ["templates/*.html"]},
    python_requires=">=3.8",
    install_requires=[
        "gitpython>=3.1.40",
        "jinja2>=3.1.4",
    ],
    entry_points={
        "console_scripts": [
            "commit-canvas=cc.__main__:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Version Control :: Git",
        "Topic :: Software Development :: Version Control :: Git :: Hooks",
    ],
    keywords="git history visualization story timeline commit-canvas",
    license="MIT",
)