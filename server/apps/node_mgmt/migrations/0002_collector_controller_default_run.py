# Generated by Django 4.2.7 on 2025-04-16 06:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('node_mgmt', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='collector',
            name='controller_default_run',
            field=models.BooleanField(default=False, verbose_name='控制器默认运行'),
        ),
    ]
